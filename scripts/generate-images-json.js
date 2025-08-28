// scripts/generate-images-json.js
import fs from "fs";
import path from "path";
import probe from "probe-image-size";
import fetch from "node-fetch";

const imagesDir = "images";
const urlsFile = "urls.txt";
const outputFile = "images.json";

async function getImageSize(filePath) {
  if (filePath.startsWith("http")) {
    try {
      const res = await fetch(filePath);
      const result = await probe(res.body);
      return result;
    } catch (e) {
      console.error("Error fetching remote image:", filePath, e);
      return null;
    }
  } else {
    try {
      const buffer = fs.readFileSync(filePath);
      return probe.sync(buffer);
    } catch (e) {
      console.error("Error reading local image:", filePath, e);
      return null;
    }
  }
}

async function main() {
  const landscape = [];
  const portrait = [];

  // 处理本地图片
  if (fs.existsSync(imagesDir)) {
    const files = fs.readdirSync(imagesDir);
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
    const lines = fs.readFileSync(urlsFile, "utf-8").split("\n").map(l => l.trim()).filter(Boolean);
    for (const url of lines) {
      const size = await getImageSize(url);
      if (!size) continue;
      if (size.width >= size.height) landscape.push(url);
      else portrait.push(url);
    }
  }

  const result = { landscape, portrait };
  fs.writeFileSync(outputFile, JSON.stringify(result, null, 2));
  console.log("Generated", outputFile, "with", landscape.length, "landscape and", portrait.length, "portrait images.");
}

main();
