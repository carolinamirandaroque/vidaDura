import sharp from 'sharp';
import path from 'path';
import { fileURLToPath } from 'url';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const publicDir = path.resolve(__dirname, '../public');
const source = path.join(publicDir, 'app-icon.svg');

const outputs = [
  { file: 'apple-touch-icon.png', size: 180 },
  { file: 'pwa-192x192.png', size: 192 },
  { file: 'pwa-512x512.png', size: 512 },
];

for (const { file, size } of outputs) {
  await sharp(source).resize(size, size).png({ compressionLevel: 9 }).toFile(path.join(publicDir, file));
  console.log(`Wrote ${file} (${size}x${size})`);
}
