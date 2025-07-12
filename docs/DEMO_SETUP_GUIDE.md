# Demo Setup Guide

The CourtListener MCP project includes flexible demo options that work in different environments: local development, Docker containers, and full Docker Compose setups.

## Quick Start

### 1. Environment Setup
```bash
# Set up environment file
npm run demo:setup

# Edit .env and add your CourtListener API token
# Get token from: https://www.courtlistener.com/api/rest-info/
```

### 2. Choose Your Demo Mode

#### Local Development (Recommended for Testing)
```bash
# Install and start Ollama
ollama serve
ollama pull llama3.1:8b

# Run the demo
npm run demo:local
```

#### Docker with Local Ollama
```bash
# Ensure Ollama is running locally
ollama serve

# Run demo in container
npm run demo:docker
```

#### Full Docker Compose (Production-like)
```bash
# Requires external Ollama service and swarm_net network
npm run demo:compose
```

## Environment Detection

The demo automatically detects your environment and provides appropriate setup instructions:

- **Container Environment**: Shows Docker-specific troubleshooting
- **Docker Compose Available**: Suggests containerized setup
- **Local Development**: Provides local installation instructions

## Demo Features

### Interactive Chat Interface
- Natural language queries about legal cases
- Automatic tool selection based on context
- Comprehensive search across CourtListener database
- Real-time tool execution with progress indicators

### Smart Court Code Resolution
- Automatically finds correct court abbreviations
- Suggests alternatives for failed searches
- Provides educational context about court systems

### Example Queries
```
"Find recent Supreme Court cases about privacy"
"Search for cases in the 9th Circuit about employment law"
"What courts are available in California?"
"Show me cases from the Northern District of California in 2023"
```

## Troubleshooting

### Ollama Connection Issues
The demo provides environment-specific troubleshooting:

**Local Environment:**
- Check `ollama serve` is running
- Test: `curl http://localhost:11434/api/tags`
- Install from: https://ollama.ai/

**Container Environment:**
- Verify `ai_ollama` service is running
- Check `swarm_net` network connectivity
- Run: `docker ps | grep ollama`

**Docker Compose:**
- Run: `docker-compose -f docker-compose.full.yml ps`
- Check service logs: `docker-compose logs ai_ollama`

### API Token Issues
```bash
# Check if token is set
npm run demo:check

# Set up environment
npm run demo:setup
```

### Model Compatibility
For best function calling results, use:
- `llama3.1:8b` or newer
- `qwen2.5:7b` or newer  
- `mistral:7b` or newer

## Advanced Usage

### Custom Ollama Host
```bash
export OLLAMA_HOST=http://your-ollama-host:11434
npm run demo:local
```

### Running Integration Tests
```bash
npm run test:integration
```

### Docker Commands
```bash
# Build and run demo container
docker build -t courtlistener-mcp .
docker run -it --env-file .env courtlistener-mcp demo

# Full compose setup with profiles
docker-compose -f docker-compose.full.yml up --profile demo
```

## Architecture

```
┌─────────────────┐    ┌─────────────────┐    ┌─────────────────┐
│   User Input    │───▶│  Ollama LLM     │───▶│ CourtListener   │
│                 │    │                 │    │   MCP Server    │
└─────────────────┘    └─────────────────┘    └─────────────────┘
                                │                       │
                                │                       ▼
                                │              ┌─────────────────┐
                                │              │ CourtListener   │
                                │              │      API        │
                                │              └─────────────────┘
                                │                       │
                                └──────────────────────▶│
                                   Function Results    │
```

The demo showcases true MCP integration where:
1. User asks natural language questions
2. Ollama LLM determines which MCP tools to call
3. MCP server executes API calls to CourtListener
4. Results are formatted and returned to the user
5. LLM provides intelligent interpretation and follow-up suggestions
