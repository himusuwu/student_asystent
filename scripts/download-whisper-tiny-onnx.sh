#!/bin/bash

echo "📥 Pobieranie Whisper-tiny w formacie ONNX z Hugging Face..."
echo ""

TARGET_DIR="public/models/Xenova/whisper-tiny"

# Sprawdź czy folder już istnieje
if [ -d "$TARGET_DIR/onnx" ]; then
    echo "⚠️  Folder $TARGET_DIR/onnx już istnieje!"
    read -p "Czy chcesz usunąć i pobrać ponownie? (y/N): " -n 1 -r
    echo
    if [[ ! $REPLY =~ ^[Yy]$ ]]; then
        echo "Anulowano."
        exit 1
    fi
    rm -rf "$TARGET_DIR"
fi

# Utwórz folder
mkdir -p "$TARGET_DIR"

echo "1️⃣ Klonowanie repozytorium Xenova/whisper-tiny..."
echo ""

# Użyj git do pobrania tylko niezbędnych plików
cd "$TARGET_DIR" || exit
git init
git remote add origin https://huggingface.co/Xenova/whisper-tiny
git config core.sparseCheckout true

# Określ które pliki pobrać
cat > .git/info/sparse-checkout << EOF
*.json
*.txt
onnx/*.onnx
onnx/*.onnx_data
EOF

echo "2️⃣ Pobieranie plików ONNX (może potrwać kilka minut)..."
git pull origin main

echo ""
echo "✅ Whisper-tiny ONNX pobrany!"
echo ""
echo "📁 Lokalizacja: $TARGET_DIR"
echo ""
echo "🧹 Sprzątanie (usuwanie .git)..."
rm -rf .git

echo ""
echo "✅ Gotowe! Teraz możesz używać modelu 'tiny' w aplikacji."
echo ""
