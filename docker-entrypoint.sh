#!/bin/sh
set -e

# Docker entrypoint script for CourtListener MCP
# Supports different run modes: server, demo, test

echo "🐳 CourtListener MCP Docker Container"
echo "======================================"

# Default command
CMD=${1:-server}

case "$CMD" in
  "server")
    echo "🚀 Starting MCP Server..."
    exec node build/index.js
    ;;
  
  "demo")
    echo "🎯 Running Interactive Demo..."
    # Wait for dependencies
    if [ ! -z "$OLLAMA_HOST" ]; then
      echo "⏳ Waiting for Ollama at $OLLAMA_HOST..."
      while ! curl -s "$OLLAMA_HOST/api/tags" >/dev/null 2>&1; do
        sleep 2
        echo "   Still waiting for Ollama..."
      done
      echo "✅ Ollama is ready"
    fi
    exec npm run demo:interactive
    ;;
  
  "demo:basic")
    echo "🎯 Running Basic Demo..."
    exec node demo/ollama-interactive.js
    ;;
  
  "test")
    echo "🧪 Running Tests..."
    exec npm test
    ;;
  
  "test:integration")
    echo "🧪 Running Integration Tests..."
    exec npm run test:integration
    ;;
  
  "bash")
    echo "🐚 Starting Bash Shell..."
    exec /bin/bash
    ;;
  
  *)
    echo "❌ Unknown command: $CMD"
    echo ""
    echo "Available commands:"
    echo "  server           - Start MCP server (default)"
    echo "  demo             - Run interactive demo"
    echo "  demo:basic       - Run basic demo"
    echo "  test             - Run all tests"
    echo "  test:integration - Run integration tests"
    echo "  bash             - Start bash shell"
    exit 1
    ;;
esac
