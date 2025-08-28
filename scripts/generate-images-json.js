// scripts/generate-images-json.js
import fs from "fs";
import path from "path";
import probe from "probe-image-size";
import fetch from "node-fetch";
import https from "https";

const imagesDir = "images";      // 本地图片目录
const urlsFile = "urls.txt";     // 远程图片列表
const outputFile = "images.json"; // 输出 JSON

// 忽略自签名证书
const httpsAgent = new https.Agent({ rejectUnauthorized: false });

async function getImageSize(filePath) {
  if (filePath.startsWith("http")) {
    try {
      const res = await fetch(filePath, { agent: httpsAgent, timeout: 10000 });
      if (!res.ok) throw new Error(`HTTP ${res.status}`);
      const result = await probe(res.body);
      return result;
    } catch (e) {
      console.warn("⚠️ 远程图片获取失败，跳过:", filePath, e.message);
      return null;
    }
  } else {
    try {
      const buffer = fs.readFileSync(filePath);
      return probe.sync(buffer);
    } catch (e) {
      console.warn("⚠️ 本地图片读取失败，跳过:", filePath, e.message);
      return null;
    }
  }
}

async function main() {
  const landscape = [];
  const portrait = [];

  // 处理本地图片
  if (fs.existsSync(imagesDir)) {
    const files = fs.readdirSync(imagesDir).filter(f => /\.(jpg|jpeg|png|gif)$/i.test(f));
    for (const file of files) {
      const fullPath = path.join(imagesDir, file);
      const size = await getImageSize(fullPath);
      if (!size) continue;
      const url = `${imagesDir}/${file}`;
      if (size.width >= size.height) landscape.push(url);
      else portrait.push(url);
    }
  }

  // 处理远程图片
  if (fs.existsSync(urlsFile)) {
    const lines = fs.readFileSync(urlsFile, "utf-8")
      .split(/\r?\n/)
      .map(l => l.trim())
      .filter(Boolean);
    for (const url of lines) {
      const size = await getImageSize(url);
      if (!size) continue;
      if (size.width >= size.height) landscape.push(url);
      else portrait.push(url);
    }
  }

  const result = { landscape, portrait };
  fs.writeFileSync(outputFile, JSON.stringify(result, null, 2));
  console.log(`✅ Generated ${outputFile}: ${landscape.length} landscape, ${portrait.length} portrait`);
}

main();
