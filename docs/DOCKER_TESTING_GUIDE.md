# Docker Testing Guide

This guide explains how to run the CourtListener MCP server tests in a containerized environment, which is essential for testing MCP ↔ Ollama integration when Ollama runs in a Docker container.

## Why Docker Testing?

When Ollama runs in a Docker container (e.g., in your Docker Swarm environment), it can't communicate with an MCP server running on the host system due to network isolation. Docker testing solves this by:

1. **Running MCP server in a container** - Makes it accessible to Ollama
2. **Shared network** - Both MCP and Ollama use the same Docker network
3. **Realistic environment** - Tests the actual deployment scenario

## Quick Start

### 1. Setup Environment
```bash
# Ensure you have your API token configured
npm run demo:setup
# Edit .env and set COURTLISTENER_API_TOKEN
```

### 2. Run Docker Tests
```bash
# Run all containerized tests
npm run docker:test

# Or use the test script directly
scripts/test-docker.sh test
```

### 3. Integration Testing
```bash
# Test just the Docker integration
npm run test:docker

# Or run integration only
scripts/test-docker.sh integration
```

## Docker Test Commands

### Package.json Scripts
- `npm run test:docker` - Run Docker integration tests
- `npm run docker:test` - Full Docker test suite  
- `npm run docker:test-runner` - Run test runner container
- `npm run docker:test-cleanup` - Clean up test resources

### Test Script Commands
```bash
scripts/test-docker.sh test        # Run all Docker tests
scripts/test-docker.sh integration # Run integration tests only
scripts/test-docker.sh cleanup     # Clean up containers
scripts/test-docker.sh logs        # Show container logs
scripts/test-docker.sh shell       # Open shell in test container
scripts/test-docker.sh help        # Show help
```

## Docker Test Architecture

### Test Environment Layout
```
┌─────────────────────┐    ┌─────────────────────┐    ┌─────────────────────┐
│  Test Runner        │───▶│  MCP Server         │───▶│  Ollama Service     │
│  Container          │    │  Container          │    │  (ai_ollama)        │
│  (mcp-test-runner)  │    │  (courtlistener-    │    │                     │
│                     │    │   mcp-test)         │    │                     │
└─────────────────────┘    └─────────────────────┘    └─────────────────────┘
          │                          │                          │
          └──────────────────────────┼──────────────────────────┘
                    test_net + swarm_net networks
```

### Network Configuration
- **test_net**: Bridge network for test communication
- **swarm_net**: Your external Docker Swarm network
- **Dual networking**: Containers connect to both networks

## Test Files

### Core Test Files
- `tests/integration-docker.test.ts` - Docker-specific MCP integration tests
- `docker-compose.test.yml` - Docker Compose configuration for testing
- `Dockerfile.test` - Specialized test container image
- `scripts/test-docker.sh` - Test runner script

### Test Container Features
- **Containerized MCP Server**: Runs MCP server in isolated container
- **Network Connectivity**: Tests can reach both MCP server and Ollama
- **Environment Variables**: Proper configuration for containerized setup
- **Health Checks**: Ensures services are ready before testing

## Environment Variables

### Required
```bash
COURTLISTENER_API_TOKEN=your_token_here
```

### Optional
```bash
OLLAMA_HOST=http://ai_ollama:11434  # Ollama endpoint
MCP_SERVER_CONTAINER=courtlistener-mcp-test  # MCP container name
NODE_ENV=test                        # Test environment
```

## Test Scenarios

### 1. MCP Server Communication
Tests that the MCP server responds properly to:
- `tools/list` - List available tools
- `tools/call` - Execute tool functions
- `initialize` - MCP protocol initialization

### 2. CourtListener API Integration
Tests actual API calls:
- Search dockets (`search-dockets`)
- Get court information (`get-court`)
- Retrieve court codes (`get-court-codes`)

### 3. Ollama Network Connectivity
Tests that Ollama is reachable:
- Connection to `OLLAMA_HOST`
- Model availability check
- Network routing verification

## Troubleshooting

### Common Issues

#### 1. MCP Server Health Check Fails
```bash
# Check container logs
scripts/test-docker.sh logs

# Verify container is running
docker-compose -f docker-compose.test.yml ps
```

#### 2. Network Connectivity Issues
```bash
# Check network configuration
docker network ls | grep -E "(test_net|swarm_net)"

# Test network connectivity
docker-compose -f docker-compose.test.yml exec mcp-test-runner ping ai_ollama
```

#### 3. API Token Issues
```bash
# Verify .env file
cat .env | grep COURTLISTENER_API_TOKEN

# Check environment in container
docker-compose -f docker-compose.test.yml exec mcp-test-runner env | grep COURT
```

### Debug Commands

#### Interactive Debugging
```bash
# Open shell in test container
scripts/test-docker.sh shell

# Run tests manually
docker-compose -f docker-compose.test.yml exec mcp-test-runner npm run test:docker
```

#### Container Inspection
```bash
# Check container status
docker-compose -f docker-compose.test.yml ps

# View detailed logs
docker-compose -f docker-compose.test.yml logs -f

# Inspect container configuration
docker inspect courtlistener-mcp-test
```

## Integration with Your Environment

### Docker Swarm Setup
The test configuration is designed to work with your existing Docker Swarm:

```yaml
networks:
  test_net:
    driver: bridge
  swarm_net:
    external: true  # Uses your existing swarm network
```

### Ollama Service Integration
Tests expect Ollama to be available at:
- **Container Network**: `http://ai_ollama:11434`
- **Service Name**: `ai_ollama` (your existing service)
- **Network**: `swarm_net` (your external network)

### Customization
To adapt for different environments, modify:
- `docker-compose.test.yml` - Network and service configuration
- Environment variables in `.env`
- `OLLAMA_HOST` for different Ollama endpoints

## Advanced Usage

### Running Specific Tests
```bash
# Run only Docker integration tests
npm run test:docker

# Run with specific Jest patterns
docker-compose -f docker-compose.test.yml run --rm mcp-test-runner \
  npx jest tests/integration-docker.test.ts --verbose
```

### Performance Testing
```bash
# Run with coverage
docker-compose -f docker-compose.test.yml run --rm mcp-test-runner \
  npm run test:coverage
```

### Continuous Integration
```bash
# CI-friendly test run
scripts/test-docker.sh test && scripts/test-docker.sh cleanup
```

This Docker testing setup ensures your MCP ↔ Ollama integration works correctly in containerized environments, matching your production deployment scenario.
