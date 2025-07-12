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
    echo "  cleanup     - Clean up test containers and networks (preserves volumes)"
    echo "  full-cleanup - Clean up everything including volumes (forces rebuild)"
    echo "  rebuild     - Force rebuild of all images"
    echo "  logs        - Show test container logs"
    echo "  shell       - Open shell in test container"
    echo "  help        - Show this help"
    echo ""
    echo "Environment Variables:"
    echo "  COURTLISTENER_API_TOKEN - Your API token (required)"
    echo "  OLLAMA_HOST            - Ollama endpoint (default: http://ollama:11434)"
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
    
    # Clean up networks and orphaned containers, but preserve volumes
    echo "🧹 Cleaning up networks and orphaned containers..."
    docker-compose -f docker-compose.test.yml down --remove-orphans 2>/dev/null || true
    
    # Check if we need to build (only build if images don't exist)
    if ! docker image inspect courtlistenermcp_courtlistener-mcp-test >/dev/null 2>&1 || \
       ! docker image inspect courtlistenermcp_mcp-test-runner >/dev/null 2>&1; then
        echo "🔧 Building test containers (images don't exist)..."
        docker-compose -f docker-compose.test.yml build
    else
        echo "✅ Using existing container images (use 'rebuild' to force rebuild)"
    fi
    
    echo "🚀 Starting all services..."
    docker-compose -f docker-compose.test.yml up -d
    
    # Wait for health check with better error handling (extended timeout for Ollama)
    echo "⏳ Waiting for services to be healthy (max 300s - 5 minutes)..."
    for i in {1..60}; do
        if docker-compose -f docker-compose.test.yml ps | grep -q "(healthy)"; then
            echo "✅ Services are healthy after $((i*5)) seconds"
            break
        elif [ $i -eq 60 ]; then
            echo -e "${RED}❌ Services failed to become healthy after 300 seconds${NC}"
            echo "Container status:"
            docker-compose -f docker-compose.test.yml ps
            echo "MCP Server logs:"
            docker-compose -f docker-compose.test.yml logs --tail 20 courtlistener-mcp-test
            echo "Ollama logs:"
            docker-compose -f docker-compose.test.yml logs --tail 20 ollama
            return 1
        else
            echo "  Still waiting... ($((i*5))s elapsed)"
            sleep 5
        fi
    done
    
    echo "🧪 Running integration tests..."
    docker-compose -f docker-compose.test.yml run --rm mcp-test-runner
    
    echo "🧹 Cleaning up..."
    docker-compose -f docker-compose.test.yml down
}

run_integration_only() {
    echo -e "${GREEN}🧪 Running Integration Tests Only${NC}"
    echo "=================================="
    
    # Clean up any existing resources first, but preserve volumes to avoid re-downloading models
    echo "🧹 Cleaning up networks and orphaned containers..."
    docker-compose -f docker-compose.test.yml down --remove-orphans 2>/dev/null || true
    
    # Check if we need to build (only build if images don't exist or source changed)
    if ! docker image inspect courtlistenermcp_courtlistener-mcp-test >/dev/null 2>&1 || \
       ! docker image inspect courtlistenermcp_mcp-test-runner >/dev/null 2>&1; then
        echo "🔧 Building test containers (images don't exist)..."
        docker-compose -f docker-compose.test.yml build
    else
        echo "✅ Using existing container images (use 'rebuild' to force rebuild)"
    fi
    
    # Check if Ollama is already running and healthy
    if docker-compose -f docker-compose.test.yml ps ollama 2>/dev/null | grep -q "(healthy)"; then
        echo "✅ Ollama is already healthy, reusing existing container"
    else
        # Start Ollama service and wait for it to be healthy
        echo "🦙 Starting Ollama service..."
        docker-compose -f docker-compose.test.yml up -d ollama
        
        echo "⏳ Waiting for Ollama to be healthy (max 300s - 5 minutes)..."
        for i in {1..60}; do
            status=$(docker-compose -f docker-compose.test.yml ps ollama | grep test-ollama)
            if echo "$status" | grep -q "(healthy)"; then
                echo "✅ Ollama is healthy after $((i*5)) seconds"
                break
            elif echo "$status" | grep -q "(health: starting)"; then
                echo "  Ollama still starting... ($((i*5))s elapsed)"
            elif [ $i -eq 60 ]; then
                echo -e "${RED}❌ Ollama failed to become healthy after 300 seconds${NC}"
                echo "Container status:"
                docker-compose -f docker-compose.test.yml ps ollama
                echo "Container logs:"
                docker-compose -f docker-compose.test.yml logs --tail 20 ollama
                return 1
            else
                echo "  Still waiting... ($((i*5))s elapsed)"
            fi
            sleep 5
        done
    fi
    
    echo "🦙 Ensuring model is available..."
    docker-compose -f docker-compose.test.yml exec -T ollama ollama pull llama3.2:1b || true
    
    # Run integration tests inside the container where OLLAMA_HOST is properly set
    echo "🧪 Running integration tests in container..."
    docker-compose -f docker-compose.test.yml run --rm mcp-test-runner
}

cleanup_containers() {
    echo -e "${YELLOW}🧹 Smart Cleanup (Preserves Volumes)${NC}"
    echo "===================================="
    
    # Stop and remove containers but preserve volumes to avoid re-downloading models
    echo "🛑 Stopping containers..."
    docker-compose -f docker-compose.test.yml down --remove-orphans
    
    # Clean up dangling images and networks
    echo "🧽 Cleaning up dangling resources..."
    docker system prune -f 2>/dev/null || true
    
    echo "✅ Smart cleanup complete (volumes preserved)"
    echo "💡 Use 'full-cleanup' to remove volumes and force model re-download"
}

full_cleanup_containers() {
    echo -e "${YELLOW}🧹 Full Cleanup (Removes Everything)${NC}"
    echo "===================================="
    
    # Stop and remove containers AND volumes
    echo "🛑 Stopping containers and removing volumes..."
    docker-compose -f docker-compose.test.yml down --volumes --remove-orphans
    
    # Remove test images if they exist
    echo "🗑️  Removing test images..."
    docker images | grep courtlistener-mcp | awk '{print $3}' | xargs -r docker rmi 2>/dev/null || true
    
    # Clean up any dangling images and networks
    echo "🧽 Cleaning up dangling resources..."
    docker system prune -f 2>/dev/null || true
    
    echo "✅ Full cleanup complete"
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

force_rebuild() {
    echo -e "${YELLOW}🔨 Force Rebuilding All Images${NC}"
    echo "=============================="
    
    # Stop and remove everything first
    full_cleanup_containers
    
    # Force rebuild
    echo "🔧 Force rebuilding all container images..."
    docker-compose -f docker-compose.test.yml build --no-cache
    
    echo "✅ Rebuild complete"
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
    "full-cleanup")
        full_cleanup_containers
        ;;
    "rebuild")
        force_rebuild
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
