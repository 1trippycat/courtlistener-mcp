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

1. Build the Docker image:
   ```bash
   docker build -t courtlistener-mcp .
   ```

2. Or use Docker Compose:
   ```bash
   docker-compose up -d
   ```

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

### With Open WebUI

Open WebUI supports MCP servers through its function calling capabilities. You can integrate using either Docker or direct Node.js execution:

#### Option A: Using Docker Container (Recommended)

1. **Build the Docker image**:
   ```bash
   docker build -t courtlistener-mcp .
   ```

2. **Configure Open WebUI with Docker**:
   
   **Method 1: Docker Compose Integration**
   Create or update your `docker-compose.yml` to include both services:
   ```yaml
   version: '3.8'
   services:
     open-webui:
       image: ghcr.io/open-webui/open-webui:main
       container_name: open-webui
       volumes:
         - open-webui:/app/backend/data
       ports:
         - "3000:8080"
       environment:
         - MCP_SERVERS={"courtlistener": {"command": "docker", "args": ["exec", "courtlistener-mcp", "node", "/app/build/index.js"]}}
       depends_on:
         - courtlistener-mcp
       restart: always
   
     courtlistener-mcp:
       build: .
       container_name: courtlistener-mcp
       environment:
         - COURTLISTENER_API_TOKEN=${COURTLISTENER_API_TOKEN}
       restart: always
   
   volumes:
     open-webui:
   ```

   **Method 2: Network-based Docker Integration**
   ```bash
   # Create a shared network
   docker network create mcp-network
   
   # Run the CourtListener MCP server
   docker run -d \
     --name courtlistener-mcp \
     --network mcp-network \
     -e COURTLISTENER_API_TOKEN=your_api_token_here \
     courtlistener-mcp
   
   # Run Open WebUI with MCP configuration
   docker run -d \
     --name open-webui \
     --network mcp-network \
     -p 3000:8080 \
     -e MCP_SERVERS='{"courtlistener": {"command": "docker", "args": ["exec", "courtlistener-mcp", "node", "/app/build/index.js"]}}' \
     ghcr.io/open-webui/open-webui:main
   ```

#### Option B: Direct Node.js Integration

1. **Build the project**:
   ```bash
   npm run build
   ```

2. **Configure Open WebUI**:
   
   **Environment Variables**
   ```bash
   export MCP_SERVERS='{"courtlistener": {"command": "node", "args": ["path/to/courtlistener-mcp/build/index.js"]}}'
   ```
   
   **Configuration File**
   Create or edit your Open WebUI configuration file:
   ```json
   {
     "mcpServers": {
       "courtlistener": {
         "command": "node",
         "args": ["path/to/courtlistener-mcp/build/index.js"],
         "env": {
           "COURTLISTENER_API_TOKEN": "your_api_token_here"
         }
       }
     }
   }
   ```

#### Testing the Integration

Once configured, you can test with prompts like:
- "Search for recent Supreme Court cases about privacy"
- "Find information about the court with ID 'scotus'"
- "Look up docket entries for case number 23A994"
- "Analyze citation trends for AI-related cases"

#### Troubleshooting

- **Container Communication**: Ensure containers can communicate if using Docker networks
- **Environment Variables**: Verify your `COURTLISTENER_API_TOKEN` is properly set
- **Port Conflicts**: Make sure port 3000 (or your chosen port) is available
- **MCP Support**: Verify your Open WebUI version supports MCP integration

**Note**: The Docker approach is recommended as it provides better isolation, easier deployment, and consistent environment management. Check the Open WebUI documentation for the latest MCP integration instructions, as implementation details may vary between versions.

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

### Build and Run
```bash
# Build the image
docker build -t courtlistener-mcp .

# Run the container
docker run -d --name courtlistener-mcp courtlistener-mcp
```

### Using Docker Compose
```bash
# Start the service
docker-compose up -d

# View logs
docker-compose logs -f

# Stop the service
docker-compose down
```

### Environment Variables
- `NODE_ENV`: Set to "production" for production deployment
- `COURTLISTENER_API_TOKEN`: Your CourtListener API token (optional)

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
