#!/bin/bash

echo "🔍 Sprawdzanie konfiguracji backendu..."
echo ""

# Sprawdź FFmpeg
echo "1️⃣ Sprawdzanie FFmpeg..."
if command -v ffmpeg &> /dev/null; then
    echo "   ✅ FFmpeg zainstalowany: $(ffmpeg -version 2>&1 | head -n1)"
else
    echo "   ❌ FFmpeg NIE zainstalowany!"
    echo "      Zainstaluj: brew install ffmpeg (macOS)"
    echo ""
    exit 1
fi
echo ""

# Sprawdź zależności serwera
echo "2️⃣ Sprawdzanie zależności serwera..."
if [ -d "server/node_modules" ]; then
    echo "   ✅ Zależności zainstalowane"
else
    echo "   ⚠️  Zależności NIE zainstalowane!"
    echo "      Uruchom: cd server && npm install"
    echo ""
fi
echo ""

# Sprawdź czy port 3001 jest wolny
echo "3️⃣ Sprawdzanie portu 3001..."
if lsof -Pi :3001 -sTCP:LISTEN -t >/dev/null 2>&1 ; then
    echo "   ⚠️  Port 3001 jest zajęty (możliwe że backend już działa)"
    echo "      PID: $(lsof -Pi :3001 -sTCP:LISTEN -t)"
else
    echo "   ✅ Port 3001 wolny"
fi
echo ""

# Sprawdź modele
echo "4️⃣ Sprawdzanie modeli Whisper..."
if [ -d "public/models/Xenova/whisper-tiny" ]; then
    echo "   ✅ whisper-tiny znaleziony"
else
    echo "   ⚠️  whisper-tiny NIE znaleziony w public/models"
fi

if [ -d "public/models/Xenova/whisper-base" ]; then
    echo "   ✅ whisper-base znaleziony"
else
    echo "   ⚠️  whisper-base NIE znaleziony w public/models"
fi
echo ""

echo "✅ Sprawdzanie zakończone!"
echo ""
echo "🚀 Aby uruchomić backend:"
echo "   cd server && npm start"
echo ""
