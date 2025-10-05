#!/bin/bash
# Stop script for Student Assistant

echo "🛑 Stopping Student Assistant..."
echo ""

# Colors
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
NC='\033[0m' # No Color

# Stop backend (Node.js on port 3001)
echo -e "${YELLOW}Stopping backend...${NC}"
lsof -ti:3001 | xargs kill -9 2>/dev/null
if [ $? -eq 0 ]; then
    echo -e "${GREEN}✅ Backend stopped${NC}"
else
    echo -e "${YELLOW}ℹ️  Backend was not running${NC}"
fi

# Stop frontend (Python HTTP server on port 8000)
echo -e "${YELLOW}Stopping frontend...${NC}"
lsof -ti:8000 | xargs kill -9 2>/dev/null
if [ $? -eq 0 ]; then
    echo -e "${GREEN}✅ Frontend stopped${NC}"
else
    echo -e "${YELLOW}ℹ️  Frontend was not running${NC}"
fi

echo ""
echo -e "${GREEN}✅ All servers stopped${NC}"
