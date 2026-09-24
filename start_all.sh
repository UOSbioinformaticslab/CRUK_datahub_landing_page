#!/bin/bash

# Colors for friendly terminal output
GREEN='\033[0;32m'
BLUE='\033[0;34m'
YELLOW='\033[1;33m'
RED='\033[0;31m'
NC='\033[0m' # No Color

echo -e "${BLUE}====================================================${NC}"
echo -e "${BLUE}   CRUK Metadata Catalogue - Automated Starter     ${NC}"
echo -e "${BLUE}====================================================${NC}\n"

# Prevent killing interactive shell if script is sourced
safe_exit() {
    local code="${1:-0}"
    if [ "${BASH_SOURCE[0]}" != "$0" ]; then
        return "$code" 2>/dev/null || exit "$code"
    else
        exit "$code"
    fi
}

# 1. Determine workspace root directory
SCRIPT_DIR="$( cd "$( dirname "${BASH_SOURCE[0]}" )" && pwd )"
if [ -f "$SCRIPT_DIR/package.json" ]; then
    BASE_DIR="$( cd "$SCRIPT_DIR/.." && pwd )"
elif [ -f "./CRUK_datahub_landing_page/package.json" ]; then
    BASE_DIR="$(pwd)"
else
    echo -e "${RED}Error: Could not locate workspace root directory.${NC}"
    safe_exit 1
fi

echo -e "${GREEN}[1/5] Working directory:${NC} $BASE_DIR"

# 2. Virtual Environment Setup
VENV_DIR="$BASE_DIR/.venv"
if [ ! -d "$VENV_DIR" ]; then
    echo -e "${YELLOW}[2/5] Creating Python virtual environment at .venv...${NC}"
    python3 -m venv "$VENV_DIR" || true
else
    echo -e "${GREEN}[2/5] Using Python virtual environment at .venv${NC}"
fi

# Activate virtual environment
if [ -f "$VENV_DIR/bin/activate" ]; then
    source "$VENV_DIR/bin/activate"
fi

UVICORN_BIN="$VENV_DIR/bin/uvicorn"
if [ ! -f "$UVICORN_BIN" ]; then
    UVICORN_BIN="uvicorn"
fi

# 3. Check & Install Dependencies
echo -e "${GREEN}[3/5] Checking dependencies...${NC}"

# Ensure core microservices packages exist
if ! "$VENV_DIR/bin/python" -c "import fastapi, uvicorn" 2>/dev/null; then
    echo "  -> Installing Python requirements for core services..."
    if [ -f "$BASE_DIR/basic/basic_backend/requirements.txt" ]; then
        pip install -q -r "$BASE_DIR/basic/basic_backend/requirements.txt" 2>/dev/null || true
    fi
    if [ -f "$BASE_DIR/middle/requirements.txt" ]; then
        pip install -q -r "$BASE_DIR/middle/requirements.txt" 2>/dev/null || true
    fi
else
    echo -e "${GREEN}  ✓ Core backend dependencies ready in .venv${NC}"
fi

# Ensure AI microservice packages exist if repo is present
if [ -d "$BASE_DIR/ai/ai-microservices" ]; then
    if ! "$VENV_DIR/bin/python" -c "import google.genai" 2>/dev/null; then
        echo "  -> Installing Python requirements for AI Microservices (google-genai)..."
        pip install -q -r "$BASE_DIR/ai/ai-microservices/requirements.txt" 2>/dev/null || true
    else
        echo -e "${GREEN}  ✓ AI microservice dependencies (google-genai) ready in .venv${NC}"
    fi
fi

if [ -d "$BASE_DIR/CRUK_datahub_landing_page" ] && [ ! -d "$BASE_DIR/CRUK_datahub_landing_page/node_modules" ]; then
    echo "  -> Installing Node modules for Frontend Landing Page..."
    (cd "$BASE_DIR/CRUK_datahub_landing_page" && npm install) || true
else
    echo -e "${GREEN}  ✓ Node modules ready${NC}"
fi

# 4. Check Environment Configuration (.env) & AI Key Availability
echo -e "${GREEN}[4/5] Checking environment configuration...${NC}"

check_env() {
    local dir="$1"
    local name="$2"
    if [ -d "$BASE_DIR/$dir" ]; then
        if [ ! -f "$BASE_DIR/$dir/.env" ]; then
            if [ -f "$BASE_DIR/$dir/.env.example" ]; then
                echo -e "${YELLOW}  ! Creating $name .env from .env.example${NC}"
                cp "$BASE_DIR/$dir/.env.example" "$BASE_DIR/$dir/.env" 2>/dev/null || true
            fi
        else
            echo -e "${GREEN}  ✓ Found $name .env file${NC}"
        fi
    fi
}

check_env "basic/basic_backend" "Basic Backend"
check_env "middle" "Middle Layer"
check_env "ai/ai-microservices" "AI Microservices"

RUN_AI=true
if [ ! -d "$BASE_DIR/ai/ai-microservices" ]; then
    RUN_AI=false
    echo -e "${YELLOW}  ⓘ AI Microservices repository not found locally — Port 8001 will be skipped.${NC}"
else
    AI_KEY=""
    if [ -f "$BASE_DIR/ai/ai-microservices/.env" ]; then
        AI_KEY=$(grep 'GEMINI_API_KEY' "$BASE_DIR/ai/ai-microservices/.env" 2>/dev/null | cut -d'=' -f2 | tr -d ' "' || true)
    fi
    if [ -z "$AI_KEY" ] || [ "$AI_KEY" = "your_google_gemini_api_key_here" ]; then
        RUN_AI=false
        echo -e "${YELLOW}  ⓘ GEMINI_API_KEY not configured in ai/ai-microservices/.env — Port 8001 will be skipped.${NC}"
    fi
fi

# 5. Robust Port Cleanup per port (8000, 8001, 8002, 5173)
echo -e "${GREEN}[5/5] Freeing ports (8000, 8001, 8002, 5173)...${NC}"
for port in 8000 8001 8002 5173; do
    PORT_PIDS=$(lsof -t -iTCP:$port -sTCP:LISTEN 2>/dev/null || true)
    if [ -n "$PORT_PIDS" ]; then
        for pid in $PORT_PIDS; do
            # Find parent PID (uvicorn watcher process) to prevent auto-respawn
            PARENT_PID=$(ps -o ppid= -p $pid 2>/dev/null | tr -d ' ' || true)
            if [ -n "$PARENT_PID" ] && [ "$PARENT_PID" -gt 1 ] 2>/dev/null; then
                echo "  -> Freeing port $port (Worker PID: $pid, Parent Watcher PID: $PARENT_PID)..."
                kill -9 $PARENT_PID $pid 2>/dev/null || true
            else
                echo "  -> Freeing port $port (PID: $pid)..."
                kill -9 $pid 2>/dev/null || true
            fi
        done
    fi
done

# Secondary pkill fallback for uvicorn and vite processes
pkill -9 -f "main:app" 2>/dev/null || true
pkill -9 -f "uvicorn" 2>/dev/null || true
pkill -9 -f "vite" 2>/dev/null || true

# Wait until all listening sockets are verified free
for port in 8000 8001 8002 5173; do
    for i in {1..15}; do
        STILL_LISTENING=$(lsof -t -iTCP:$port -sTCP:LISTEN 2>/dev/null || true)
        if [ -z "$STILL_LISTENING" ]; then
            break
        fi
        sleep 0.2
    done
done

# Graceful Shutdown Handler for Ctrl+C
cleanup() {
    echo -e "\n\n${YELLOW}Stopping all CRUK services...${NC}"
    kill $(jobs -p) 2>/dev/null || true
    echo -e "${GREEN}All services stopped cleanly.${NC}"
    safe_exit 0
}
trap cleanup SIGINT SIGTERM

echo -e "\n${BLUE}====================================================${NC}"
echo -e "${GREEN} Starting services (Press Ctrl+C to stop all)${NC}"
echo -e "${BLUE}====================================================${NC}"
echo -e "  • Basic Backend:    ${BLUE}http://localhost:8000${NC}"
echo -e "  • Middle Layer:     ${BLUE}http://localhost:8002${NC}"
if [ "$RUN_AI" = true ]; then
    echo -e "  • AI Microservices: ${BLUE}http://localhost:8001${NC}"
else
    echo -e "  • AI Microservices: ${YELLOW}SKIPPED (Private repo / No Gemini API key)${NC}"
fi
echo -e "  • Frontend App:     ${BLUE}http://localhost:5173${NC}"
echo -e "${BLUE}====================================================${NC}\n"

# Launch Backend Microservices (Explicit IPv4 localhost)
(cd "$BASE_DIR/basic/basic_backend" && "$UVICORN_BIN" main:app --host 127.0.0.1 --port 8000 --reload) &
(cd "$BASE_DIR/middle" && "$UVICORN_BIN" main:app --host 127.0.0.1 --port 8002 --reload) &

if [ "$RUN_AI" = true ]; then
    (cd "$BASE_DIR/ai/ai-microservices" && "$UVICORN_BIN" main:app --host 127.0.0.1 --port 8001 --reload) &
fi

# Launch Frontend Landing Page (Explicit IPv4 host)
(cd "$BASE_DIR/CRUK_datahub_landing_page" && npm run dev -- --host 127.0.0.1 --strictPort) &

wait
