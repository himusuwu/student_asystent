#!/bin/bash

# Student Assistant - Offline Mode Starter
# Uruchamia wszystko co potrzebne do pracy offline

echo "🚀 Student Assistant - Tryb Offline"
echo "===================================="
echo ""

# Kolory
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
BLUE='\033[0;34m'
NC='\033[0m' # No Color

# Funkcja sprawdzająca czy proces działa
check_process() {
    if pgrep -f "$1" > /dev/null; then
        echo -e "${GREEN}✅ $2 działa${NC}"
        return 0
    else
        echo -e "${RED}❌ $2 nie działa${NC}"
        return 1
    fi
}

# Funkcja sprawdzająca port
check_port() {
    if lsof -i :$1 > /dev/null 2>&1; then
        echo -e "${GREEN}✅ Port $1 jest zajęty ($2)${NC}"
        return 0
    else
        echo -e "${RED}❌ Port $1 jest wolny ($2 nie działa)${NC}"
        return 1
    fi
}

echo -e "${BLUE}📋 Sprawdzam system...${NC}"
echo ""

# Sprawdź Ollama
if check_process "ollama serve" "Ollama"; then
    OLLAMA_OK=1
else
    OLLAMA_OK=0
    echo -e "${YELLOW}⚠️  Uruchamiam Ollama...${NC}"
    ollama serve > /tmp/ollama.log 2>&1 &
    sleep 3
    if check_process "ollama serve" "Ollama"; then
        OLLAMA_OK=1
    fi
fi

# Sprawdź model Qwen
if [ $OLLAMA_OK -eq 1 ]; then
    if curl -s http://localhost:11434/api/tags | grep -q "qwen2.5:14b"; then
        echo -e "${GREEN}✅ Model Qwen 2.5:14b jest dostępny${NC}"
    else
        echo -e "${YELLOW}⚠️  Model Qwen 2.5:14b nie został znaleziony${NC}"
        echo -e "${YELLOW}   Instaluję... (może zająć kilka minut)${NC}"
        ollama pull qwen2.5:14b
    fi
fi

# Sprawdź Backend
if check_port 3001 "Backend"; then
    BACKEND_OK=1
else
    BACKEND_OK=0
    echo -e "${YELLOW}⚠️  Uruchamiam Backend...${NC}"
    cd "$(dirname "$0")/../server" || exit 1
    npm start > /tmp/backend.log 2>&1 &
    sleep 3
    cd - > /dev/null || exit 1
    if check_port 3001 "Backend"; then
        BACKEND_OK=1
    fi
fi

# Sprawdź Frontend
if check_port 8000 "Frontend"; then
    FRONTEND_OK=1
else
    FRONTEND_OK=0
    echo -e "${YELLOW}⚠️  Uruchamiam Frontend...${NC}"
    cd "$(dirname "$0")/.." || exit 1
    python3 -m http.server 8000 > /tmp/frontend.log 2>&1 &
    sleep 2
    if check_port 8000 "Frontend"; then
        FRONTEND_OK=1
    fi
fi

echo ""
echo "===================================="
echo ""

# Podsumowanie
if [ $OLLAMA_OK -eq 1 ] && [ $BACKEND_OK -eq 1 ] && [ $FRONTEND_OK -eq 1 ]; then
    echo -e "${GREEN}🎉 Wszystko działa! System gotowy do pracy offline!${NC}"
    echo ""
    echo -e "${BLUE}📱 Otwórz w przeglądarce:${NC}"
    echo "   http://localhost:8000"
    echo ""
    echo -e "${BLUE}🧪 Test systemu:${NC}"
    echo "   http://localhost:8000/test-offline.html"
    echo ""
    echo -e "${BLUE}📊 Status:${NC}"
    echo "   - Ollama (Qwen): http://localhost:11434"
    echo "   - Backend: http://localhost:3001/health"
    echo "   - Frontend: http://localhost:8000"
    echo ""
    
    # Otwórz w przeglądarce
    if command -v open &> /dev/null; then
        echo -e "${YELLOW}🌐 Otwieram aplikację...${NC}"
        sleep 2
        open http://localhost:8000/test-offline.html
    fi
else
    echo -e "${RED}⚠️  Nie wszystkie komponenty działają!${NC}"
    echo ""
    echo -e "${YELLOW}Sprawdź logi:${NC}"
    echo "   - Ollama: /tmp/ollama.log"
    echo "   - Backend: /tmp/backend.log"
    echo "   - Frontend: /tmp/frontend.log"
    echo ""
    exit 1
fi

echo ""
echo -e "${YELLOW}💡 Aby zatrzymać wszystko:${NC}"
echo "   npm stop"
echo ""
echo -e "${YELLOW}📚 Dokumentacja:${NC}"
echo "   docs/OFFLINE_GUIDE.md"
echo ""
