# CourtListener MCP Server

A Model Context Protocol (MCP) server that provides access to the CourtListener API, enabling AI assistants to search and retrieve information about US court cases, opinions, dockets, and court information.

## Quick Start

1. **Clone and Install**:
   ```bash
   git clone <repository-url>
   cd CourtListener\ MCP
   npm install
   ```

2. **Configure Environment**:
   ```bash
   cp .env.example .env
   # Edit .env and add your CourtListener API token
   ```

3. **Build and Run**:
   ```bash
   npm run build
   npm start
   ```

## Environment Configuration

Create a `.env` file based on `.env.example`:

```bash
# Required: Your CourtListener API token
COURTLISTENER_API_TOKEN=your_api_token_here

# Optional: Security settings
RATE_LIMIT_REQUESTS=100
RATE_LIMIT_WINDOW_MS=60000
REQUEST_TIMEOUT_MS=30000
```

Get your API token from: https://www.courtlistener.com/api/

## Features

- **Comprehensive Search**: Search across dockets, opinion clusters, individual opinions, and courts
- **Detailed Information**: Get specific details about any court case, opinion, or court
- **Flexible Filtering**: Use various filters including date ranges, court jurisdictions, case names, and more
- **Authentication Support**: Works with both authenticated and unauthenticated requests
- **Rate Limiting**: Built-in rate limiting and security controls
- **Docker Support**: Easy deployment with Docker and Docker Compose

## Available Tools

### Case Law (Opinion-based data)

#### Dockets
- `search-dockets` - Search for court dockets using various filters
- `get-docket` - Get detailed information about a specific docket by ID

#### Opinion Clusters
- `search-clusters` - Search for opinion clusters (groups of related opinions)
- `get-cluster` - Get detailed information about a specific opinion cluster by ID

#### Opinions
- `search-opinions` - Search for individual court opinions
- `get-opinion` - Get detailed information about a specific opinion by ID

#### Courts
- `list-courts` - Get a list of available courts
- `get-court` - Get detailed information about a specific court by ID

### RECAP/PACER (Docket-based data)

#### Docket Entries
- `search-docket-entries` - Search for docket entries within a specific docket
- `get-docket-entry` - Get detailed information about a specific docket entry by ID

#### Parties
- `search-parties` - Search for parties within a specific docket
- `get-party` - Get detailed information about a specific party by ID

#### Attorneys
- `search-attorneys` - Search for attorneys within a specific docket
- `get-attorney` - Get detailed information about a specific attorney by ID

#### RECAP Documents
- `search-recap-documents` - Search for RECAP documents within a specific docket entry
- `get-recap-document` - Get detailed information about a specific RECAP document by ID
- `recap-query` - Fast document lookup by court, case number, and document number

## Installation

### Prerequisites

- Node.js 18+ (Node.js 20+ recommended for full compatibility)
- npm or yarn

### From Source

1. Clone this repository
2. Install dependencies:
   ```bash
   npm install
   ```
3. Build the project:
   ```bash
   npm run build
   ```

### Using Docker

#### Option 1: Use Published Image
```bash
# Pull and run the published image
docker pull ghcr.io/1trippycat/courtlistener-mcp:latest
docker run -d --name courtlistener-mcp \
  -e COURTLISTENER_API_TOKEN=your_token_here \
  ghcr.io/1trippycat/courtlistener-mcp:latest
```

#### Option 2: Build Locally
```bash
# Build the Docker image locally
docker build -t courtlistener-mcp .
docker run -d --name courtlistener-mcp \
  -e COURTLISTENER_API_TOKEN=your_token_here \
  courtlistener-mcp
```

#### Option 3: Use Docker Compose
```bash
# Copy the example compose file
cp docker-compose.example.yml docker-compose.yml

# Edit environment variables in .env file
cp .env.example .env

# Start services
docker-compose up -d
```

**Note**: MCP servers communicate via stdio/exec, not HTTP ports. The container doesn't expose ports but can be accessed by MCP clients using `docker exec` commands.

## Usage

### With Claude for Desktop

1. Build the project:
   ```bash
   npm run build
   ```

2. Add to your Claude Desktop configuration file:

   **macOS/Linux**: `~/Library/Application Support/Claude/claude_desktop_config.json`
   **Windows**: `%APPDATA%\\Claude\\claude_desktop_config.json`

   ```json
   {
     "mcpServers": {
       "courtlistener": {
         "command": "node",
         "args": ["path/to/courtlistener-mcp/build/index.js"]
       }
     }
   }
   ```

3. Restart Claude for Desktop

### With Other MCP Clients

The server communicates via stdio transport. Run it with:

```bash
node build/index.js
```

## Tool Usage Examples

### Case Law Examples

#### Search for Supreme Court Cases
```
Use the search-clusters tool with:
- court: "scotus" 
- precedential_status: "Published"
- limit: 10
```

#### Find Cases by Docket Number
```
Use the search-dockets tool with:
- docket_number: "23A994"
- court: "scotus"
```

#### Search Opinions by Author
```
Use the search-opinions tool with:
- author: "Roberts"
- court: "scotus"
- limit: 5
```

#### Get Court Information
```
Use the get-court tool with:
- court_id: "scotus"
```

### RECAP/PACER Examples

#### Search Docket Entries for a Case
```
Use the search-docket-entries tool with:
- docket_id: 12345
- description: "motion"
- limit: 20
```

#### Find Parties in a Case
```
Use the search-parties tool with:
- docket_id: 12345
- name: "Corporation"
```

#### List Attorneys for a Case
```
Use the search-attorneys tool with:
- docket_id: 12345
- name: "Smith"
```

#### Search Documents in a Docket Entry
```
Use the search-recap-documents tool with:
- docket_entry_id: 67890
- document_type: "Motion"
- is_available: true
```

#### Fast Document Lookup
```
Use the recap-query tool with:
- court: "nysd"
- docket_number: "1:20-cv-12345"
- document_number: 1
```

## Authentication

While many CourtListener API endpoints work without authentication, you can provide an API token for:
- Higher rate limits
- Access to additional features
- Priority processing

To use authentication, pass the `auth_token` parameter to any tool call, or set the `COURTLISTENER_API_TOKEN` environment variable.

Get an API token from: https://www.courtlistener.com/api/

## API Reference

This server interfaces with the CourtListener REST API v4. For detailed API documentation, see:
https://www.courtlistener.com/help/api/rest/case-law/

## Development

### Building
```bash
npm run build
```

### Development Mode
```bash
npm run dev
```

### Running Tests
```bash
npm test            # Run all tests
npm run test:watch  # Run tests in watch mode
npm run test:coverage  # Generate coverage report
npm run check-env   # Check environment configuration
```

See [TESTING_GUIDE.md](TESTING_GUIDE.md) for comprehensive testing documentation and best practices.

## Docker Deployment

### Using Published Image

The easiest way to use this MCP server is with the published Docker image:

```bash
# Pull the latest image
docker pull ghcr.io/1trippycat/courtlistener-mcp:latest

# Run with your API token
docker run -d \
  --name courtlistener-mcp \
  -e COURTLISTENER_API_TOKEN=your_api_token_here \
  ghcr.io/1trippycat/courtlistener-mcp:latest
```

### Using Docker Compose

Use the included `docker-compose.example.yml` file:

```bash
# Copy the example compose file
cp docker-compose.example.yml docker-compose.yml

# Configure environment variables
cp .env.example .env
# Edit .env and set your COURTLISTENER_API_TOKEN

# Start all services (including optional Open WebUI)
docker-compose up -d

# Or start just the MCP server
docker-compose up -d courtlistener-mcp

# Check logs
docker-compose logs -f courtlistener-mcp

# Stop services
docker-compose down
```

### Build and Run Locally
docker-compose logs -f courtlistener-mcp
```

## MCP Communication

The CourtListener MCP server communicates via the Model Context Protocol using stdio transport. Here are the main ways to connect:

### Docker Exec Method (Recommended for containerized environments)
```bash
# Connect via docker exec
docker exec -i courtlistener-mcp node /app/build/index.js
```

### Direct Node.js Method (For local development)
```bash
# Connect directly to the built application
node build/index.js
```

### Integration Examples

#### With MCP Client Applications
```json
{
  "mcpServers": {
    "courtlistener": {
      "command": "docker",
      "args": ["exec", "-i", "courtlistener-mcp", "node", "/app/build/index.js"]
    }
  }
}
```

#### With Custom Applications
```bash
# Example: Connect and send MCP messages
echo '{"jsonrpc": "2.0", "id": 1, "method": "tools/list"}' | \
  docker exec -i courtlistener-mcp node /app/build/index.js
```

### Debugging Container Communication:

```bash
# Test if container is running
docker ps | grep courtlistener-mcp

# Check container logs
docker logs courtlistener-mcp

# Execute commands in container
docker exec -it courtlistener-mcp node /app/build/index.js

# Check health status
docker inspect courtlistener-mcp --format='{{.State.Health.Status}}'
```

### Build from Source
```bash
# Build the image
docker build -t courtlistener-mcp .

# Run the container
docker run -d --name courtlistener-mcp courtlistener-mcp
```

### Environment Variables
- `NODE_ENV`: Set to "production" for production deployment
- `COURTLISTENER_API_TOKEN`: Your CourtListener API token (optional but recommended)
- `RATE_LIMIT_REQUESTS`: Requests per minute (default: 100)
- `RATE_LIMIT_WINDOW_MS`: Rate limit window in milliseconds (default: 60000)
- `REQUEST_TIMEOUT_MS`: API request timeout (default: 30000)

## Rate Limiting

The CourtListener API has rate limits:
- **Unauthenticated**: 5,000 requests per hour
- **Authenticated**: 50,000 requests per hour

The server automatically handles rate limiting and provides meaningful error messages when limits are exceeded.

## Data Sources

CourtListener contains millions of court documents from:
- Supreme Court of the United States
- Federal Courts of Appeals
- Federal District Courts
- State Supreme Courts
- Many other federal and state courts

Data sources include:
- Court websites
- PACER (federal court records)
- Harvard Caselaw Access Project
- Resource.org
- Other legal databases

## Contributing

1. Fork the repository
2. Create a feature branch
3. Make your changes
4. Add tests (when test framework is set up)
5. Submit a pull request

## License

MIT License - see LICENSE file for details

## Support

- CourtListener API Documentation: https://www.courtlistener.com/help/api/
- MCP Documentation: https://modelcontextprotocol.io/
- Report issues on GitHub

## Acknowledgments

- Free Law Project for maintaining CourtListener
- Model Context Protocol team for the MCP framework
- The open source legal data community
