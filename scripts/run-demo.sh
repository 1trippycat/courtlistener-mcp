#!/bin/bash

# CourtListener MCP Demo Runner
# Provides easy commands for different demo modes

set -e

SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
PROJECT_ROOT="$(dirname "$SCRIPT_DIR")"

cd "$PROJECT_ROOT"

# Colors for output
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
BLUE='\033[0;34m'
NC='\033[0m' # No Color

print_usage() {
    echo "🎯 CourtListener MCP Demo Runner"
    echo "================================"
    echo ""
    echo "Usage: $0 <command>"
    echo ""
    echo "Commands:"
    echo "  local       - Run demo locally (requires local Ollama)"
    echo "  docker      - Run demo in Docker with local Ollama"
    echo "  compose     - Run full Docker Compose setup (MCP + Ollama)"
    echo "  test        - Run integration tests"
    echo "  check       - Check environment and dependencies"
    echo "  setup       - Set up environment files"
    echo "  help        - Show this help"
    echo ""
    echo "Prerequisites:"
    echo "• COURTLISTENER_API_TOKEN set in .env file"
    echo "• For local: Ollama installed and running"
    echo "• For docker: Docker installed"
    echo "• For compose: Docker Compose and external swarm_net"
}

check_environment() {
    echo -e "${BLUE}🔍 Checking Environment${NC}"
    echo "=========================="
    
    # Check Node.js
    if command -v node >/dev/null 2>&1; then
        echo -e "✅ Node.js: $(node --version)"
    else
        echo -e "❌ Node.js not found"
        return 1
    fi
    
    # Check npm
    if command -v npm >/dev/null 2>&1; then
        echo -e "✅ npm: $(npm --version)"
    else
        echo -e "❌ npm not found"
        return 1
    fi
    
    # Check Docker
    if command -v docker >/dev/null 2>&1; then
        echo -e "✅ Docker: $(docker --version | head -n1)"
    else
        echo -e "⚠️  Docker not found (needed for docker/compose modes)"
    fi
    
    # Check Docker Compose
    if command -v docker-compose >/dev/null 2>&1 || docker compose version >/dev/null 2>&1; then
        echo -e "✅ Docker Compose available"
    else
        echo -e "⚠️  Docker Compose not found (needed for compose mode)"
    fi
    
    # Check .env file
    if [ -f ".env" ]; then
        if grep -q "COURTLISTENER_API_TOKEN=" .env; then
            echo -e "✅ .env file exists with API token"
        else
            echo -e "⚠️  .env file exists but no COURTLISTENER_API_TOKEN found"
        fi
    else
        echo -e "❌ .env file not found"
        echo -e "   Run: $0 setup"
    fi
    
    # Check if built
    if [ -d "build" ] && [ -f "build/index.js" ]; then
        echo -e "✅ Project built"
    else
        echo -e "⚠️  Project not built - building now..."
        npm run build
    fi
    
    echo ""
}

setup_env() {
    echo -e "${BLUE}🔧 Setting up environment${NC}"
    echo "========================="
    
    if [ ! -f ".env" ]; then
        if [ -f ".env.example" ]; then
            cp .env.example .env
            echo -e "✅ Created .env from .env.example"
        else
            echo -e "❌ No .env.example found"
            return 1
        fi
    else
        echo -e "✅ .env file already exists"
    fi
    
    echo ""
    echo -e "${YELLOW}⚠️  Please edit .env and set your COURTLISTENER_API_TOKEN${NC}"
    echo "You can get a token from: https://www.courtlistener.com/api/rest-info/"
    echo ""
}

run_local() {
    echo -e "${GREEN}💻 Running Local Demo${NC}"
    echo "===================="
    
    # Check Ollama
    if ! curl -s http://localhost:11434/api/tags >/dev/null 2>&1; then
        echo -e "${RED}❌ Ollama not running on localhost:11434${NC}"
        echo "Please start Ollama: ollama serve"
        echo "Or install from: https://ollama.ai/"
        return 1
    fi
    
    echo -e "✅ Ollama is running"
    node demo/ollama-interactive.js
}

run_docker() {
    echo -e "${GREEN}🐳 Running Docker Demo${NC}"
    echo "======================"
    
    # Check if Ollama is accessible
    OLLAMA_HOST=${OLLAMA_HOST:-http://localhost:11434}
    if ! curl -s "$OLLAMA_HOST/api/tags" >/dev/null 2>&1; then
        echo -e "${RED}❌ Ollama not accessible at $OLLAMA_HOST${NC}"
        echo "Please ensure Ollama is running and accessible"
        return 1
    fi
    
    echo -e "✅ Ollama accessible at $OLLAMA_HOST"
    docker build -t courtlistener-mcp .
    docker run -it --rm \
        --env-file .env \
        -e OLLAMA_HOST="$OLLAMA_HOST" \
        --network host \
        courtlistener-mcp demo
}

run_compose() {
    echo -e "${GREEN}🐳 Running Docker Compose Demo${NC}"
    echo "=============================="
    
    # Check for external network
    if ! docker network ls | grep -q swarm_net; then
        echo -e "${YELLOW}⚠️  Creating swarm_net network${NC}"
        docker network create swarm_net || true
    fi
    
    echo -e "✅ Using docker-compose.full.yml"
    docker-compose -f docker-compose.full.yml up --build --profile demo
}

run_tests() {
    echo -e "${GREEN}🧪 Running Integration Tests${NC}"
    echo "============================"
    
    npm run test:integration
}

# Main command processing
case "${1:-help}" in
    "local")
        check_environment
        run_local
        ;;
    "docker")
        check_environment
        run_docker
        ;;
    "compose")
        check_environment
        run_compose
        ;;
    "test")
        check_environment
        run_tests
        ;;
    "check")
        check_environment
        ;;
    "setup")
        setup_env
        ;;
    "help"|*)
        print_usage
        ;;
esac
