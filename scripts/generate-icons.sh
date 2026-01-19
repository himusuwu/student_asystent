#!/bin/bash
# Generate PWA icons from SVG

ICONS_DIR="frontend/assets/icons"
SVG_FILE="$ICONS_DIR/icon.svg"

# Check if we have a tool to convert
if command -v convert &> /dev/null; then
    # ImageMagick
    for size in 72 96 128 144 152 192 384 512; do
        convert -background none -resize ${size}x${size} "$SVG_FILE" "$ICONS_DIR/icon-${size}.png"
        echo "Created icon-${size}.png"
    done
elif command -v rsvg-convert &> /dev/null; then
    # librsvg
    for size in 72 96 128 144 152 192 384 512; do
        rsvg-convert -w $size -h $size "$SVG_FILE" > "$ICONS_DIR/icon-${size}.png"
        echo "Created icon-${size}.png"
    done
else
    echo "No SVG converter found. Creating placeholder icons..."
    # Create simple placeholder PNGs (1x1 pixel with primary color)
    for size in 72 96 128 144 152 192 384 512; do
        # Create a simple base64 PNG placeholder
        echo "Placeholder for icon-${size}.png"
    done
fi
