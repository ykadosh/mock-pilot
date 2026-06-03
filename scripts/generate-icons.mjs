#!/usr/bin/env node
// Generates app icons for macOS (.icns) and Windows (.ico) from source
// 1024x1024 PNGs at resources/macos-icon.png and resources/windows-icon.png.
// Intermediate PNG variants are written, used to build the .icns/.ico, then deleted.
import { readFile, writeFile, mkdir, unlink } from "node:fs/promises";
import { existsSync } from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";
import sharp from "sharp";
import png2icons from "png2icons";

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const ROOT = path.resolve(__dirname, "..");
const RESOURCES = path.join(ROOT, "resources");

const SIZES = [1024, 512, 256, 128, 64, 32, 16];

async function resizePng(srcBuffer, size) {
  return sharp(srcBuffer)
    .resize(size, size, { fit: "contain", background: { r: 0, g: 0, b: 0, alpha: 0 } })
    .png()
    .toBuffer();
}

async function assertSource(filePath) {
  if (!existsSync(filePath)) {
    throw new Error(`Source icon not found: ${filePath}`);
  }
  const meta = await sharp(filePath).metadata();
  if (meta.width !== 1024 || meta.height !== 1024) {
    console.warn(`Warning: ${path.basename(filePath)} is ${meta.width}x${meta.height}, expected 1024x1024.`);
  }
}

async function generateMacIcons() {
  const src = path.join(RESOURCES, "macos-icon.png");
  await assertSource(src);
  const srcBuffer = await readFile(src);

  console.log("Generating macOS PNG variants...");
  const pngPaths = [];
  for (const size of SIZES) {
    const out = path.join(RESOURCES, `app-icon-${size}x${size}.png`);
    const buf = await resizePng(srcBuffer, size);
    await writeFile(out, buf);
    pngPaths.push(out);
    console.log(`  ${path.relative(ROOT, out)}`);
  }

  console.log("Generating icon.icns...");
  const src1024 = await resizePng(srcBuffer, 1024);
  const icns = png2icons.createICNS(src1024, png2icons.BICUBIC, 0);
  if (!icns) throw new Error("Failed to create .icns");
  const icnsPath = path.join(RESOURCES, "icon.icns");
  await writeFile(icnsPath, icns);
  console.log(`  ${path.relative(ROOT, icnsPath)}`);

  console.log("Cleaning up intermediate PNGs...");
  for (const p of pngPaths) {
    await unlink(p);
    console.log(`  removed ${path.relative(ROOT, p)}`);
  }
}

async function generateWindowsIcons() {
  const src = path.join(RESOURCES, "windows-icon.png");
  await assertSource(src);
  const srcBuffer = await readFile(src);

  console.log("Generating icon.ico...");
  const src1024 = await resizePng(srcBuffer, 1024);
  const ico = png2icons.createICO(src1024, png2icons.BICUBIC, 0, true);
  if (!ico) throw new Error("Failed to create .ico");
  const icoPath = path.join(RESOURCES, "icon.ico");
  await writeFile(icoPath, ico);
  console.log(`  ${path.relative(ROOT, icoPath)}`);
}

async function main() {
  if (!existsSync(RESOURCES)) await mkdir(RESOURCES, { recursive: true });
  await generateMacIcons();
  await generateWindowsIcons();
  console.log("\nDone.");
}

main().catch((err) => {
  console.error(err);
  process.exit(1);
});

