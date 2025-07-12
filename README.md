# CourtListener MCP Server

A Model Context Protocol (MCP) server that provides access to the CourtListener API, enabling AI assistants to search and retrieve information about US court cases, opinions, dockets, and court information.

## 🚀 Quick Start

### 1. Choose Your Deployment
```bash
# Standalone MCP server (minimal)
docker-compose up -d

# Full stack with Ollama integration (built around Ollama - cloud integrations coming soon)
docker-compose -f docker-compose.full.yml up -d

# Testing environment
./scripts/test-docker.sh integration
```

### 2. Setup Environment
```bash
cp .env.example .env
# Edit .env and add your COURTLISTENER_API_TOKEN
# Configure OLLAMA_MODEL if using AI integration
```

### 3. Run Interactive Demo
```bash
# Local development with Ollama integration
npm run demo:interactive

# Docker-based demo (starts all services including demo)
docker-compose -f docker-compose.full.yml up
```

For detailed setup instructions, see [docs/DOCKER_GUIDE.md](docs/DOCKER_GUIDE.md).

## 📋 Documentation

- **[Docker Guide](docs/DOCKER_GUIDE.md)** - Complete Docker deployment guide (standalone, full, test)
- **[MCP Integration](docs/MCP_INTEGRATION_GUIDE.md)** - Integration patterns and examples
- **[Testing Guide](docs/TESTING_GUIDE.md)** - Development and testing procedures
- **[Demo Guide](docs/DEMO_GUIDE.md)** - Interactive demonstrations
- **[RECAP Tools](docs/RECAP_TOOLS.md)** - PACER/federal court document tools
- **[Quick Examples](docs/QUICK_EXAMPLES.md)** - Common usage patterns

## 🐳 Docker Configurations

### Standalone (Default)
Basic MCP server without AI integration:
```bash
docker-compose up -d
```

### Full Stack
Complete environment with Ollama integration:
```bash
docker-compose -f docker-compose.full.yml up -d
```

### Test Environment
Isolated testing with configurable models:
```bash
./scripts/test-docker.sh integration
```

> **Note**: This system is built around Ollama for local AI functionality. Cloud-based integrations are coming soon.

## 🔧 Configuration

### Environment Variables (.env)
```bash
# Required
COURTLISTENER_API_TOKEN=your_api_token_here

# Ollama Configuration (Built around Ollama - cloud integrations coming soon)
OLLAMA_HOST=http://localhost:11434
OLLAMA_MODEL=qwen2.5:7b              # Production model
OLLAMA_MODEL_TEST=qwen2.5:7b         # Test model

# Security Settings
RATE_LIMIT_REQUESTS=100
RATE_LIMIT_WINDOW_MS=60000
REQUEST_TIMEOUT_MS=30000
```

Get your API token from: https://www.courtlistener.com/api/

## 🛠️ Available Tools

### Case Law Tools
- **search-dockets**: Search for court dockets using various filters
- **get-docket**: Get detailed information about a specific docket by ID
- **search-clusters**: Search for opinion clusters (groups of related opinions)
- **get-cluster**: Get detailed information about a specific opinion cluster by ID
- **search-opinions**: Search for individual court opinions
- **get-opinion**: Get detailed information about a specific opinion by ID
- **list-courts**: Get a list of available courts
- **get-court**: Get detailed information about a specific court by ID

### RECAP/PACER Tools
- **search-docket-entries**: Search for docket entries within a specific docket
- **get-docket-entry**: Get detailed information about a specific docket entry by ID
- **search-parties**: Search for parties within a specific docket
- **get-party**: Get detailed information about a specific party by ID
- **search-attorneys**: Search for attorneys within a specific docket
- **get-attorney**: Get detailed information about a specific attorney by ID
- **search-recap-documents**: Search for RECAP documents within a specific docket entry
- **get-recap-document**: Get detailed information about a specific RECAP document by ID
- **recap-query**: Fast document lookup by court, case number, and document number

## 💡 Usage Examples

### With Claude Desktop
Add to your `claude_desktop_config.json`:
```json
{
  "mcpServers": {
    "courtlistener": {
      "command": "docker",
      "args": ["exec", "-i", "courtlistener-mcp", "node", "/app/build/index.js"],
      "env": {
        "COURTLISTENER_API_TOKEN": "your_token_here"
      }
    }
  }
}
```

### Common Searches
```
# Search Supreme Court cases
"Use search-clusters with court: 'scotus' and precedential_status: 'Published'"

# Find cases by docket number  
"Use search-dockets with docket_number: '23A994' and court: 'scotus'"

# Search by author
"Use search-opinions with author: 'Roberts' and court: 'scotus'"

# Fast document lookup
"Use recap-query with court: 'nysd', docket_number: '1:20-cv-12345', document_number: 1"
```

## 🏛️ Court Jurisdiction Codes

Reference the comprehensive list of all 3,352+ available court jurisdiction codes:
**[CourtListener Court Codes](https://www.courtlistener.com/help/api/jurisdictions/)**

**Common Examples:**
- `scotus` - Supreme Court of the United States
- `ca9` - Court of Appeals for the Ninth Circuit
- `cand` - Northern District of California
- `nysd` - Southern District of New York
- `cal` - California Supreme Court

## 🔧 Development

### Building
```bash
npm install
npm run build
```

### Testing
```bash
npm test                    # Run all tests
npm run test:docker        # Run Docker integration tests
./scripts/test-docker.sh integration  # Full integration testing
```

### Demo Scripts
```bash
npm run demo:interactive    # 🎯 RECOMMENDED: Full chat interface
npm run demo:mcp-integration # Technical MCP integration test
npm run demo:advanced      # Advanced conversational interface
```

### Local Development
```bash
npm run dev                 # Development mode
npm run demo:check         # Verify environment setup
```

## 🔐 Authentication & Rate Limits

- **Unauthenticated**: 5,000 requests per hour
- **Authenticated**: 50,000 requests per hour

While many endpoints work without authentication, providing an API token enables:
- Higher rate limits
- Access to additional features
- Priority processing

## 📊 Data Sources

CourtListener contains millions of court documents from:
- Supreme Court of the United States
- Federal Courts of Appeals and District Courts
- State Supreme Courts and Appellate Courts
- PACER (federal court records)
- Harvard Caselaw Access Project
- Other legal databases

## 🤝 Contributing

1. Fork the repository
2. Create a feature branch
3. Make your changes
4. Add tests for new functionality
5. Submit a pull request

## 📄 License

MIT License - see LICENSE file for details

## 🔗 Resources

- **CourtListener API**: https://www.courtlistener.com/help/api/
- **Model Context Protocol**: https://modelcontextprotocol.io/
- **Free Law Project**: https://free.law/

## 🆘 Support

- Report issues on GitHub
- Check [docs/](docs/) for detailed guides
- Review [TESTING_GUIDE.md](docs/TESTING_GUIDE.md) for troubleshooting

---

> **Built for the Legal Community**: Enabling AI assistants to access comprehensive US court data through the Model Context Protocol.
