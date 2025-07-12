# Demo Guide

The CourtListener MCP project includes flexible demo options that work in different environments: local development, Docker containers, and full Docker Compose setups. This guide shows you how to demo and test the CourtListener MCP server with various AI clients, including Ollama integration.

## 🚀 Quick Start

### 1. Environment Setup
```bash
# Copy environment file and configure
cp .env.example .env
# Edit .env and add your COURTLISTENER_API_TOKEN
# Configure OLLAMA_MODEL if using AI integration
```

### 2. Choose Your Demo Mode

#### **Recommended**: Interactive Demo with AI
```bash
# Best experience - full chat interface with AI
npm run demo:interactive
```

#### Simple Demo (Quick Test)
```bash
# Streamlined demo for basic testing
npm run demo:simple
```

#### Built-in Interactive Demo
```bash
# Basic MCP server demonstration
npm run demo
```

## 🐳 Docker Demo Options

### Local Development with Ollama
```bash
# Ensure Ollama is running locally
ollama serve
ollama pull qwen2.5:7b

# Run the demo
npm run demo:local
```

### Full Docker Stack Demo
```bash
# Complete environment with integrated Ollama
docker-compose -f docker-compose.full.yml --profile demo up

# Or without demo container (just MCP + Ollama)
docker-compose -f docker-compose.full.yml up -d
npm run demo:interactive
```

### Docker with External Ollama
```bash
# Demo in container with local Ollama
npm run demo:docker
```

## 🤖 AI Integration Demos

> **Note**: This system is built around Ollama for local AI functionality. Cloud-based integrations are coming soon.

### Interactive Chat Demo (🎯 Recommended)

The best demonstration experience:

```bash
npm run demo:interactive
```

**Features**:
- ✅ Full chat interface where you can ask legal questions
- 🚀 AI automatically uses MCP tools to research answers  
- 🏛️ Real-time CourtListener API integration
- 🤖 Configurable Ollama models via OLLAMA_MODEL
- 💭 Natural conversation with legal research capabilities

**Example Conversations**:
```
You: "Find recent Supreme Court cases about First Amendment"
AI: I'll search for recent Supreme Court First Amendment cases...
    [Uses search-clusters tool with court: "scotus"]
    [Analyzes results and provides summary]

You: "Tell me about the court structure in California"  
AI: Let me look up California court information...
    [Uses get-court tool for California courts]
    [Explains court hierarchy]
```

### Technical Integration Demo

For developers testing MCP integration:

```bash
npm run demo:mcp-integration
```

**What it demonstrates**:
- ✅ Real MCP communication via JSON-RPC
- 🚀 Direct tool calling between Ollama and MCP server  
- 📋 Configurable model support (OLLAMA_MODEL environment variable)
- 🤖 Function calling with legal context
- 💡 AI-powered legal research workflow
- 🔍 Dynamic query generation and execution
- 📊 Complete analysis and insights pipeline

### Advanced Integration Demo

```bash
npm run demo:advanced
```

Advanced conversational interface with:
- Multi-turn conversations
- Context retention
- Advanced query planning
- Legal domain expertise

## 🔧 Environment Detection & Setup

The demos automatically detect your environment and provide appropriate setup instructions:

- **Container Environment**: Docker-specific troubleshooting
- **Docker Compose Available**: Containerized setup suggestions  
- **Local Development**: Local installation instructions
- **Ollama Detection**: Model availability and recommendations

### Prerequisites

1. **Install Ollama**: https://ollama.ai/
2. **Start Ollama**:
   ```bash
   ollama serve
   ```
3. **Pull a recommended model**:
   ```bash
   # Best function calling support (default)
   ollama pull qwen2.5:7b
   
   # Alternative faster model
   ollama pull llama3.2:3b
   
   # Minimal resource model
   ollama pull llama3.2:1b
   ```

## 🧪 Testing Your Demo

### Demo Verification

```bash
npm run test:demo
```

Verifies:
- ✅ MCP server starts correctly
- ✅ Tools are registered and accessible  
- ✅ Sample API calls work
- ✅ Ollama availability and model access
- ✅ Environment configuration

### Full Integration Tests

```bash
npm test                                    # All tests
npm run test:docker                        # Docker integration
./scripts/test-docker.sh integration      # Full E2E testing
```

## 📋 Demo Scenarios

### Scenario 1: Legal Research Assistant

Show how an AI can:
1. **Search for cases by topic**: "Find cases about data privacy"
2. **Analyze court jurisdictions**: "What courts handle patent disputes?"
3. **Find related opinions**: "Show similar cases to this Supreme Court ruling"
4. **Track case trends**: "How has the court ruled on tech issues recently?"

### Scenario 2: Court Information Lookup

Demonstrate:
1. **Court details**: "Tell me about the 9th Circuit Court structure"
2. **Jurisdiction understanding**: "Which court would handle this type of case?"
3. **Court-specific data**: "Show recent activity in the Southern District of New York"

### Scenario 3: Advanced Legal Analysis (with Ollama)

With AI integration:
1. **Smart research suggestions**: AI analyzes context and suggests relevant searches
2. **Dynamic query generation**: AI creates search terms based on legal concepts
3. **Automated analysis**: AI summarizes findings and identifies patterns
4. **Legal insights**: AI provides domain-specific analysis of court data

## 🐳 Docker Demo Configurations

### Standalone Demo
```bash
# Basic MCP server demo
docker-compose up -d
docker-compose exec courtlistener-mcp npm run demo
```

### Full Stack Demo
```bash
# Complete environment with Ollama
docker-compose -f docker-compose.full.yml up -d

# Run interactive demo
docker-compose -f docker-compose.full.yml exec courtlistener-mcp npm run demo:interactive

# Or use the dedicated demo container
docker-compose -f docker-compose.full.yml --profile demo up
```

### Test Environment Demo
```bash
# Isolated testing environment
./scripts/test-docker.sh integration

# Access demo in test environment
./scripts/test-docker.sh shell
npm run demo:interactive
```

## 🛠️ Manual Testing with Claude Desktop

### 1. Build the Server
```bash
npm run build
```

### 2. Configure Claude Desktop

Add to your configuration file:
- **macOS**: `~/Library/Application Support/Claude/claude_desktop_config.json`
- **Windows**: `%APPDATA%\Claude\claude_desktop_config.json`

```json
{
  "mcpServers": {
    "courtlistener": {
      "command": "docker",
      "args": ["exec", "-i", "courtlistener-mcp", "node", "/app/build/index.js"],
      "env": {
        "COURTLISTENER_API_TOKEN": "your_api_token_here"
      }
    }
  }
}
```

### 3. Test Queries in Claude Desktop

Try these example queries:
- "Search for recent Supreme Court cases about technology"
- "Find information about the 9th Circuit Court"  
- "Look up recent opinions mentioning artificial intelligence"
- "Show me federal district courts in California"
- "Find cases with docket number containing 'cv-2023'"

## 🔍 Troubleshooting

### MCP Server Issues
```bash
# Check environment configuration
npm run check-env

# View detailed logs
NODE_ENV=development npm start

# Test individual tools
npm run demo:interactive
```

### Ollama Issues
```bash
# Check if Ollama is running
curl http://localhost:11434/api/tags

# Start Ollama service
ollama serve

# List available models
ollama list

# Pull recommended model for testing
ollama pull qwen2.5:7b
```

### API Issues
- Verify CourtListener API token is valid and set in `.env`
- Check rate limits (authenticated: 50K/hour, unauthenticated: 5K/hour)
- Ensure internet connectivity for API calls
- Review logs for specific error messages

### Docker Issues
```bash
# Check container status
docker-compose ps

# View container logs
docker-compose logs courtlistener-mcp

# Access container shell
docker-compose exec courtlistener-mcp bash

# Restart services
docker-compose restart
```

## 🚀 Integration Examples

### Custom MCP Client
```javascript
import { spawn } from 'child_process';

const mcp = spawn('node', ['build/index.js']);

// Send MCP request
const request = {
  jsonrpc: '2.0',
  id: 1,
  method: 'tools/call',
  params: {
    name: 'search-dockets',
    arguments: { court: 'scotus', page_size: 5 }
  }
};

mcp.stdin.write(JSON.stringify(request) + '\n');
```

### With Open WebUI
Add MCP server configuration to Open WebUI for a complete legal research interface integrated with your AI workflow.

## 📊 Performance Notes

- **Cold start**: ~2-3 seconds
- **API response time**: ~1-5 seconds per query  
- **Memory usage**: ~50-100MB (standalone), ~2-4GB (with Ollama)
- **Concurrent requests**: Handles multiple MCP clients
- **Model performance**: qwen2.5:7b provides best function calling accuracy

## 🔮 Next Steps

1. **Integrate with your AI workflow**: Add to Claude Desktop, Open WebUI, or custom applications
2. **Customize for specific domains**: Extend tools for specialized legal research areas  
3. **Scale deployment**: Use Docker Compose for production environments
4. **Explore cloud integration**: Cloud-based AI integrations coming soon

---

🎉 **Ready to demo!** Start with `npm run demo:interactive` for the best experience, or explore specific deployment types using the Docker configurations.
