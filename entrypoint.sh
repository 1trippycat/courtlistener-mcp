#!/bin/sh
set -e

# MCP Server Entrypoint Script
# This script ensures the MCP server stays alive and handles stdin properly

echo "Starting CourtListener MCP Server..."

# Check if running in interactive mode (has stdin)
if [ -t 0 ]; then
    echo "Interactive mode detected - starting MCP server with stdin"
    exec node /app/build/index.js
else
    echo "Non-interactive mode - keeping container alive for docker exec connections"
    
    # Create a named pipe for stdin simulation
    mkfifo /tmp/mcp_stdin
    
    # Start the MCP server in background with the named pipe
    tail -f /tmp/mcp_stdin | node /app/build/index.js &
    MCP_PID=$!
    
    echo "MCP Server started with PID: $MCP_PID"
    echo "Container ready for MCP connections via 'docker exec -i'"
    
    # Function to handle shutdown signals
    shutdown() {
        echo "Received shutdown signal, stopping MCP server..."
        kill $MCP_PID 2>/dev/null || true
        rm -f /tmp/mcp_stdin
        exit 0
    }
    
    # Set up signal handlers
    trap shutdown TERM INT
    
    # Keep the container alive and monitor the MCP process
    while kill -0 $MCP_PID 2>/dev/null; do
        sleep 5
    done
    
    echo "MCP Server process ended unexpectedly"
    exit 1
fi
