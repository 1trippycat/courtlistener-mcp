# CourtListener MCP Server - Demo Guide

This guide shows you how to demo and test the CourtListener MCP server with various AI clients, including Ollama.

## Quick Demo

### 1. Simple Demo (Recommended)

For a quick working demonstration:

```bash
npm run demo:simple
```

This streamlined demo:
- ✅ Tests Ollama connectivity
- 🚀 Starts the MCP server  
- 🏛️ Fetches real court data
- 🤖 Uses Ollama for AI analysis
- 💭 Shows practical AI + legal data integration

### 2. Basic Interactive Demo

Run the built-in interactive demo to see all MCP tools in action:

```bash
npm run demo
```

This will:
- Start the MCP server
- Show available tools
- Demonstrate court searches
- Display sample dockets and opinions
- Show the server capabilities

### 3. Interactive Mode

For hands-on testing:

```bash
npm run demo:interactive
```

This provides an interactive shell where you can:
- Type `help` for commands
- Test individual tools
- Explore the API interactively

## Ollama Integration Demo

### Prerequisites

1. **Install Ollama**: https://ollama.ai/
2. **Start Ollama**:
   ```bash
   ollama serve
   ```
3. **Pull a model**:
   ```bash
   ollama pull llama3.2
   # or
   ollama pull llama2
   ```

### Run the Integration Demo

```bash
npm run demo:ollama
```

This sophisticated demo will:
1. ✅ Check if Ollama is running
2. 🚀 Start the CourtListener MCP server
3. 📋 Fetch real court data via MCP tools
4. 🤖 Use Ollama to analyze the legal information
5. 💡 Generate intelligent search suggestions
6. 🔍 Execute those searches via MCP
7. 📊 Provide final analysis and insights

### What the Ollama Demo Shows

The integration demonstrates:
- **Real MCP Communication**: Direct JSON-RPC calls to MCP tools
- **AI-Powered Analysis**: Ollama analyzes court data and suggests searches
- **Dynamic Queries**: AI generates search terms based on context
- **Legal Research Workflow**: Complete cycle from data retrieval to insights

## Manual Testing with Claude Desktop

### 1. Build the Server

```bash
npm run build
```

### 2. Configure Claude Desktop

Add to your Claude Desktop configuration file:

**macOS**: `~/Library/Application Support/Claude/claude_desktop_config.json`
**Windows**: `%APPDATA%\Claude\claude_desktop_config.json`

```json
{
  "mcpServers": {
    "courtlistener": {
      "command": "node",
      "args": ["/absolute/path/to/CourtListener MCP/build/index.js"],
      "env": {
        "COURTLISTENER_API_TOKEN": "your_api_token_here"
      }
    }
  }
}
```

### 3. Test in Claude Desktop

Restart Claude Desktop and try queries like:
- "Search for recent Supreme Court cases about technology"
- "Find information about the 9th Circuit Court"
- "Look up recent opinions mentioning artificial intelligence"

## Docker Demo

### Build and Run with Docker

```bash
# Build the image
docker build -t courtlistener-mcp .

# Run with environment variables
docker run -e COURTLISTENER_API_TOKEN=your_token_here courtlistener-mcp
```

### Using Docker Compose

```bash
# Copy and configure environment
cp .env.example .env
# Edit .env with your API token

# Start with Docker Compose
docker-compose up
```

## Testing Your Demo

### Run Demo Tests

```bash
npm run test:demo
```

This verifies:
- ✅ MCP server starts correctly
- ✅ Tools are registered and accessible
- ✅ Sample API calls work
- ✅ Ollama availability (if running)

### Full Test Suite

```bash
npm test
```

Runs all 35+ tests including:
- Security validation
- API integration
- Tool functionality
- Error handling

## Demo Scenarios

### Scenario 1: Legal Research Assistant

Show how an AI can:
1. Search for cases by topic
2. Analyze court jurisdictions
3. Find related opinions
4. Track case trends

### Scenario 2: Court Information Lookup

Demonstrate:
1. Getting detailed court information
2. Understanding court hierarchies
3. Accessing court-specific data

### Scenario 3: Advanced Legal Analysis

With Ollama integration:
1. AI suggests research directions
2. Dynamically generates search queries
3. Analyzes and summarizes findings
4. Provides legal insights

## Troubleshooting

### MCP Server Issues

```bash
# Check environment
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

# Start Ollama
ollama serve

# List available models
ollama list

# Pull a smaller model for testing
ollama pull phi3:mini
```

### API Issues

- Verify your CourtListener API token is valid
- Check rate limits (100 requests/minute by default)
- Ensure internet connectivity for API calls

## Integration Examples

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

Add MCP server configuration to Open WebUI for a complete legal research interface.

## Performance Notes

- Cold start: ~2-3 seconds
- API response time: ~1-5 seconds per query
- Memory usage: ~50-100MB
- Concurrent requests: Handles multiple MCP clients

## Next Steps

1. **Integrate with your AI workflow**
2. **Customize tools for specific legal domains**
3. **Add more court systems or legal databases**
4. **Build domain-specific analysis tools**

---

🎉 **Ready to demo!** Start with `npm run demo` and explore the powerful combination of MCP and AI for legal research.
