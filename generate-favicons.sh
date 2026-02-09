#!/bin/bash

# GRADIENT Favicon Generator
# This script generates all required favicon formats from the SVG source
# Requires: ImageMagick (convert command)

echo "🎨 GRADIENT - Favicon Generator"
echo "================================"

# Check if ImageMagick is installed
if ! command -v convert &> /dev/null; then
    echo "❌ ImageMagick not found. Install it first:"
    echo "   Ubuntu/Debian: sudo apt-get install imagemagick"
    echo "   MacOS: brew install imagemagick"
    echo "   Or use the online tool: https://realfavicongenerator.net/"
    exit 1
fi

SOURCE="favicon-source.svg"

if [ ! -f "$SOURCE" ]; then
    echo "❌ Source file '$SOURCE' not found!"
    exit 1
fi

echo "✓ ImageMagick found"
echo "✓ Source file found: $SOURCE"
echo ""
echo "Generating favicons..."

# Generate PNG favicons
convert "$SOURCE" -resize 16x16 favicon-16x16.png
echo "✓ favicon-16x16.png"

convert "$SOURCE" -resize 32x32 favicon-32x32.png
echo "✓ favicon-32x32.png"

convert "$SOURCE" -resize 180x180 apple-touch-icon.png
echo "✓ apple-touch-icon.png"

convert "$SOURCE" -resize 192x192 icon-192x192.png
echo "✓ icon-192x192.png"

convert "$SOURCE" -resize 512x512 icon-512x512.png
echo "✓ icon-512x512.png"

convert "$SOURCE" -resize 512x512 logo.png
echo "✓ logo.png"

# Generate multi-size ICO file
convert "$SOURCE" -resize 16x16 favicon-16.png
convert "$SOURCE" -resize 32x32 favicon-32.png
convert "$SOURCE" -resize 48x48 favicon-48.png
convert favicon-16.png favicon-32.png favicon-48.png favicon.ico
rm favicon-16.png favicon-32.png favicon-48.png
echo "✓ favicon.ico (16x16, 32x32, 48x48)"

echo ""
echo "✅ All favicons generated successfully!"
echo ""
echo "📝 TODO: Create manually with design tool:"
echo "   - og-image.png (1200x630) - Social media preview"
echo "   - twitter-card.png (1200x675) - Twitter preview"
echo "   - screenshot.png (1280x720) - App screenshot"
echo ""
echo "💡 Tip: Use Canva or Figma to create social media images"
echo "    Include logo + text 'GRADIENT - Outil de dessin gratuit'"
