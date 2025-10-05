#!/bin/bash
# Start script for Student Assistant

echo "🚀 Starting Student Assistant..."
echo ""

# Colors
GREEN='\033[0;32m'
BLUE='\033[0;34m'
YELLOW='\033[1;33m'
NC='\033[0m' # No Color

# Function to check if port is in use
check_port() {
    lsof -i:$1 > /dev/null 2>&1
    return $?
}

# Start backend
echo -e "${BLUE}📦 Starting backend server...${NC}"
if check_port 3001; then
    echo -e "${YELLOW}⚠️  Backend already running on port 3001${NC}"
else
    cd server
    npm start > /dev/null 2>&1 &
    BACKEND_PID=$!
    cd ..
    sleep 2
    if check_port 3001; then
        echo -e "${GREEN}✅ Backend started on http://localhost:3001${NC}"
    else
        echo -e "${YELLOW}⚠️  Backend failed to start. Check server logs.${NC}"
    fi
fi

echo ""

# Start frontend
echo -e "${BLUE}🌐 Starting frontend server...${NC}"
if check_port 8000; then
    echo -e "${YELLOW}⚠️  Frontend already running on port 8000${NC}"
else
    python3 -m http.server 8000 > /dev/null 2>&1 &
    FRONTEND_PID=$!
    sleep 1
    if check_port 8000; then
        echo -e "${GREEN}✅ Frontend started on http://localhost:8000${NC}"
    else
        echo -e "${YELLOW}⚠️  Frontend failed to start${NC}"
    fi
fi

echo ""
echo -e "${GREEN}🎉 Student Assistant is ready!${NC}"
echo ""
echo "📍 Access the app:"
echo -e "   ${BLUE}http://localhost:8000/student_assistant_app.html${NC}"
echo ""
echo "📍 Backend API:"
echo -e "   ${BLUE}http://localhost:3001/health${NC}"
echo ""
echo "To stop servers:"
echo "   killall -9 python3 node"
echo ""
