#!/usr/bin/env node
/**
 * Generate PNG icons from SVG favicon
 * Requires: npm install --save-dev sharp
 * Run: node scripts/generate-icons.js
 */

import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

async function generateIcons() {
  try {
    const sharp = (await import('sharp')).default;
    const svgPath = path.join(__dirname, '../public/favicon.svg');
    const publicDir = path.join(__dirname, '../public');

    if (!fs.existsSync(svgPath)) {
      console.error('❌ favicon.svg not found at', svgPath);
      process.exit(1);
    }

    console.log('🎨 Generating PNG icons from favicon.svg...');

    // 192x192
    await sharp(svgPath)
      .resize(192, 192, { fit: 'contain', background: { r: 255, g: 255, b: 255, alpha: 1 } })
      .png()
      .toFile(path.join(publicDir, 'icon-192x192.png'));
    console.log('✅ Generated: icon-192x192.png');

    // 512x512
    await sharp(svgPath)
      .resize(512, 512, { fit: 'contain', background: { r: 255, g: 255, b: 255, alpha: 1 } })
      .png()
      .toFile(path.join(publicDir, 'icon-512x512.png'));
    console.log('✅ Generated: icon-512x512.png');

    // Maskable 192x192 (for adaptive icons on Android 12+)
    await sharp(svgPath)
      .resize(192, 192, { fit: 'contain', background: { r: 255, g: 106, b: 0, alpha: 0 } })
      .png()
      .toFile(path.join(publicDir, 'icon-192x192-maskable.png'));
    console.log('✅ Generated: icon-192x192-maskable.png');

    // Maskable 512x512
    await sharp(svgPath)
      .resize(512, 512, { fit: 'contain', background: { r: 255, g: 106, b: 0, alpha: 0 } })
      .png()
      .toFile(path.join(publicDir, 'icon-512x512-maskable.png'));
    console.log('✅ Generated: icon-512x512-maskable.png');

    console.log('\n✨ All icons generated successfully!');
  } catch (error) {
    if (error.code === 'MODULE_NOT_FOUND') {
      console.error('❌ sharp not installed. Run: npm install --save-dev sharp');
      console.log('\nAlternatively, use online tools to convert favicon.svg to PNG:');
      console.log('  - https://cloudconvert.com/svg-to-png');
      console.log('  - https://convertio.co/svg-png/');
      process.exit(1);
    } else {
      console.error('❌ Error generating icons:', error.message);
      process.exit(1);
    }
  }
}

generateIcons();
