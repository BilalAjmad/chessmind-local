// Generate PWA icons from the knight mark SVG (public/icon.svg)
// Run: bun scripts/gen-icons.mjs
import sharp from "sharp";

const SRC = "public/icon.svg";
const OUT = [
  { size: 192, file: "public/icon-192.png" },
  { size: 512, file: "public/icon-512.png" },
  { size: 1024, file: "build/icon-1024.png" },
  { size: 512, file: "build/icon.png" }, // electron-builder fallback for win/linux
];

for (const { size, file } of OUT) {
  await sharp(SRC, { density: 400 })
    .resize(size, size)
    .png()
    .toFile(file);
  console.log("wrote", file, `${size}x${size}`);
}
console.log("done");
