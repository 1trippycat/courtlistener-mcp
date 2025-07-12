#!/bin/bash

# Docker Test Runner for CourtListener MCP
# Runs tests in containerized environment for proper MCP ↔ Ollama integration

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
    echo "🐳 CourtListener MCP Docker Test Runner"
    echo "======================================="
    echo ""
    echo "Usage: $0 <command>"
    echo ""
    echo "Commands:"
    echo "  test        - Run all Docker tests"
    echo "  integration - Run integration tests only"
    echo "  cleanup     - Clean up test containers and networks"
    echo "  logs        - Show test container logs"
    echo "  shell       - Open shell in test container"
    echo "  help        - Show this help"
    echo ""
    echo "Environment Variables:"
    echo "  COURTLISTENER_API_TOKEN - Your API token (required)"
    echo "  OLLAMA_HOST            - Ollama endpoint (default: http://ai_ollama:11434)"
}

check_dependencies() {
    echo -e "${BLUE}🔍 Checking Dependencies${NC}"
    echo "=========================="
    
    # Check Docker
    if ! command -v docker >/dev/null 2>&1; then
        echo -e "${RED}❌ Docker not found${NC}"
        return 1
    fi
    echo -e "✅ Docker: $(docker --version | head -n1)"
    
    # Check Docker Compose
    if ! command -v docker-compose >/dev/null 2>&1 && ! docker compose version >/dev/null 2>&1; then
        echo -e "${RED}❌ Docker Compose not found${NC}"
        return 1
    fi
    echo -e "✅ Docker Compose available"
    
    # Check .env file
    if [ ! -f ".env" ]; then
        echo -e "${YELLOW}⚠️  .env file not found${NC}"
        echo "Creating .env from .env.example..."
        if [ -f ".env.example" ]; then
            cp .env.example .env
            echo -e "${YELLOW}📝 Please edit .env and set your COURTLISTENER_API_TOKEN${NC}"
        else
            echo -e "${RED}❌ .env.example not found${NC}"
            return 1
        fi
    fi
    
    # Check API token
    if ! grep -q "COURTLISTENER_API_TOKEN=" .env || grep -q "COURTLISTENER_API_TOKEN=$" .env; then
        echo -e "${YELLOW}⚠️  COURTLISTENER_API_TOKEN not set in .env${NC}"
        echo "Please edit .env and add your API token"
    else
        echo -e "✅ API token configured"
    fi
    
    echo ""
}

run_docker_tests() {
    echo -e "${GREEN}🐳 Running Docker Tests${NC}"
    echo "======================="
    
    # Build and run test containers
    echo "🔧 Building test containers..."
    docker-compose -f docker-compose.test.yml build
    
    echo "🚀 Starting MCP server container..."
    docker-compose -f docker-compose.test.yml up -d --profile test
    
    # Wait for health check
    echo "⏳ Waiting for MCP server to be healthy..."
    timeout 60 bash -c 'until docker-compose -f docker-compose.test.yml ps | grep -q "healthy"; do sleep 2; done'
    
    if ! docker-compose -f docker-compose.test.yml ps | grep -q "healthy"; then
        echo -e "${RED}❌ MCP server failed to start properly${NC}"
        docker-compose -f docker-compose.test.yml logs courtlistener-mcp-test
        return 1
    fi
    
    echo "✅ MCP server is healthy"
    
    echo "🧪 Running integration tests..."
    docker-compose -f docker-compose.test.yml run --rm mcp-test-runner
    
    echo "🧹 Cleaning up..."
    docker-compose -f docker-compose.test.yml down
}

run_integration_only() {
    echo -e "${GREEN}🧪 Running Integration Tests Only${NC}"
    echo "=================================="
    
    # Run just the integration test
    npm run test:docker
}

cleanup_containers() {
    echo -e "${YELLOW}🧹 Cleaning Up Docker Resources${NC}"
    echo "================================"
    
    # Stop and remove containers
    docker-compose -f docker-compose.test.yml down --volumes --remove-orphans
    
    # Remove test images if they exist
    docker images | grep courtlistener-mcp | awk '{print $3}' | xargs -r docker rmi || true
    
    echo "✅ Cleanup complete"
}

show_logs() {
    echo -e "${BLUE}📋 Test Container Logs${NC}"
    echo "======================"
    
    docker-compose -f docker-compose.test.yml logs
}

open_shell() {
    echo -e "${BLUE}🐚 Opening Shell in Test Container${NC}"
    echo "=================================="
    
    docker-compose -f docker-compose.test.yml exec mcp-test-runner bash
}

# Main command processing
case "${1:-help}" in
    "test")
        check_dependencies
        run_docker_tests
        ;;
    "integration")
        check_dependencies
        run_integration_only
        ;;
    "cleanup")
        cleanup_containers
        ;;
    "logs")
        show_logs
        ;;
    "shell")
        open_shell
        ;;
    "help"|*)
        print_usage
        ;;
esac
