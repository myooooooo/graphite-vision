#!/usr/bin/env node

/**
 * GRADIENT Favicon Generator
 * Generates all required favicon formats from SVG using Canvas
 */

import fs from 'fs';
import { createCanvas, loadImage } from 'canvas';

const SIZES = {
  'favicon-16x16.png': 16,
  'favicon-32x32.png': 32,
  'apple-touch-icon.png': 180,
  'icon-192x192.png': 192,
  'icon-512x512.png': 512,
  'logo.png': 512
};

async function generateFavicon(sourceSvg, outputPath, size) {
  try {
    const canvas = createCanvas(size, size);
    const ctx = canvas.getContext('2d');

    // Load SVG as image
    const img = await loadImage(sourceSvg);

    // Draw with antialiasing
    ctx.imageSmoothingEnabled = true;
    ctx.imageSmoothingQuality = 'high';
    ctx.drawImage(img, 0, 0, size, size);

    // Save as PNG
    const buffer = canvas.toBuffer('image/png');
    fs.writeFileSync(outputPath, buffer);

    return true;
  } catch (error) {
    throw error;
  }
}

async function main() {
  console.log('🎨 GRADIENT - Favicon Generator');
  console.log('================================\n');

  const sourceSvg = 'favicon-source.svg';

  if (!fs.existsSync(sourceSvg)) {
    console.error(`❌ Source file '${sourceSvg}' not found!`);
    process.exit(1);
  }

  console.log(`✓ Source file found: ${sourceSvg}\n`);
  console.log('Generating favicons...\n');

  try {
    // Generate all PNG sizes
    for (const [filename, size] of Object.entries(SIZES)) {
      await generateFavicon(sourceSvg, filename, size);
      console.log(`✓ ${filename}`);
    }

    console.log('\n✅ All favicons generated successfully!\n');
    console.log('📝 TODO: Create manually with design tool:');
    console.log('   - og-image.png (1200x630) - Social media preview');
    console.log('   - twitter-card.png (1200x675) - Twitter preview');
    console.log('   - screenshot.png (1280x720) - App screenshot');
    console.log('   - favicon.ico (multi-size ICO file)\n');
    console.log('💡 Tip: Use https://realfavicongenerator.net/ for ICO file');
    console.log('    Or upload PNGs to https://www.favicon-generator.org/\n');

  } catch (error) {
    if (error.code === 'MODULE_NOT_FOUND') {
      console.error('\n❌ Required module "canvas" not found.');
      console.error('\n📦 Install it with: npm install canvas');
      console.error('\n🌐 Or use online tool: https://realfavicongenerator.net/');
      console.error('   1. Upload favicon-source.svg');
      console.error('   2. Download generated favicons');
      console.error('   3. Extract to project root\n');
      process.exit(1);
    }
    throw error;
  }
}

main().catch(console.error);
