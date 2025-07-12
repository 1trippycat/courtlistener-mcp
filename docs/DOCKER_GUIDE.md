# Docker Deployment Guide

The CourtListener MCP Server provides three different Docker configurations to suit different use cases. This system is built around Ollama for local AI functionality, with cloud-based integrations coming soon.

## 🚀 Quick Start

1. **Copy environment file**:
   ```bash
   cp .env.example .env
   # Edit .env and add your COURTLISTENER_API_TOKEN
   ```

2. **Choose your deployment**:
   - **Standalone**: Just the MCP server → `docker-compose up`
   - **Full**: MCP + Ollama + Demo → `docker-compose -f docker-compose.full.yml up`
   - **Test**: Isolated testing environment → `./scripts/test-docker.sh integration`

## 📋 Docker Configurations

### 1. Standalone (`docker-compose.yml` / `docker-compose.standalone.yml`)

**Purpose**: Basic MCP server deployment without Ollama integration.

**Use Cases**:
- Production deployments with external AI services
- Integration with existing Ollama installations
- Minimal resource footprint
- CI/CD pipelines

**Services**:
- `courtlistener-mcp`: The MCP server container

**Usage**:
```bash
# Default standalone deployment
docker-compose up -d

# Or explicitly use standalone config
docker-compose -f docker-compose.standalone.yml up -d
```

**Resource Requirements**: ~100MB RAM, minimal CPU

### 2. Full (`docker-compose.full.yml`)

**Purpose**: Complete development and demonstration environment with integrated Ollama.

**Use Cases**:
- Local development with AI integration
- Demonstrations and testing
- Complete self-contained deployment
- Development environments

**Services**:
- `ollama`: Ollama LLM service with configurable model
- `courtlistener-mcp`: The MCP server with Ollama integration
- `mcp-demo`: Interactive demo application (profile: demo)

**Usage**:
```bash
# Start MCP + Ollama
docker-compose -f docker-compose.full.yml up -d

# Include demo application
docker-compose -f docker-compose.full.yml --profile demo up -d

# View logs
docker-compose -f docker-compose.full.yml logs -f
```

**Resource Requirements**: ~4GB RAM, GPU recommended for larger models

### 3. Test (`docker-compose.test.yml`)

**Purpose**: Isolated testing environment for CI/CD and development testing.

**Use Cases**:
- Automated testing
- Integration testing
- CI/CD pipelines
- Development validation

**Services**:
- `ollama`: Test Ollama instance (port 11435 to avoid conflicts)
- `mcp-test-runner`: Test execution environment

**Usage**:
```bash
# Run integration tests
./scripts/test-docker.sh integration

# Run with cleanup
./scripts/test-docker.sh integration && ./scripts/test-docker.sh cleanup

# Full cleanup (removes volumes)
./scripts/test-docker.sh full-cleanup
```

**Resource Requirements**: ~2GB RAM, automated model pulling

## 🔧 Configuration

### Environment Variables

All configurations support these environment variables (defined in `.env`):

#### Required
- `COURTLISTENER_API_TOKEN`: Your CourtListener API token

#### Ollama Configuration (Built around Ollama - cloud integrations coming soon)
- `OLLAMA_HOST`: Ollama endpoint (default: `http://localhost:11434`)
- `OLLAMA_MODEL`: Production model (default: `qwen2.5:7b`)
- `OLLAMA_MODEL_TEST`: Test model (default: `qwen2.5:7b`)

#### Server Configuration
- `NODE_ENV`: Environment mode (production/development/test)
- `RATE_LIMIT_REQUESTS`: Requests per minute (default: 100)
- `RATE_LIMIT_WINDOW_MS`: Rate limit window (default: 60000)
- `REQUEST_TIMEOUT_MS`: Request timeout (default: 30000)

### Model Selection

The system supports configurable Ollama models:

**Recommended Models**:
- `qwen2.5:7b` - Best function calling support (default)
- `llama3.2:3b` - Smaller, faster alternative
- `llama3.2:1b` - Minimal resource requirements

**Configuration**:
```bash
# In .env file
OLLAMA_MODEL=qwen2.5:7b          # For production/demo
OLLAMA_MODEL_TEST=llama3.2:3b    # For testing (faster)
```

## 🐳 Docker Commands Reference

### Standalone Deployment
```bash
# Start
docker-compose up -d

# Stop
docker-compose down

# View logs
docker-compose logs -f

# Shell access
docker-compose exec courtlistener-mcp sh
```

### Full Deployment
```bash
# Start MCP + Ollama
docker-compose -f docker-compose.full.yml up -d

# Start with demo
docker-compose -f docker-compose.full.yml --profile demo up -d

# Check Ollama status
docker-compose -f docker-compose.full.yml exec ollama ollama list

# Pull different model
docker-compose -f docker-compose.full.yml exec ollama ollama pull llama3.2:3b

# Stop
docker-compose -f docker-compose.full.yml down

# Stop and remove volumes
docker-compose -f docker-compose.full.yml down --volumes
```

### Test Environment
```bash
# Run tests (no auto-cleanup)
./scripts/test-docker.sh integration

# Smart cleanup (preserves volumes)
./scripts/test-docker.sh cleanup

# Full cleanup (removes everything)
./scripts/test-docker.sh full-cleanup

# Force rebuild
./scripts/test-docker.sh rebuild

# View test logs
./scripts/test-docker.sh logs

# Shell access
./scripts/test-docker.sh shell
```

## 🔍 Troubleshooting

### Common Issues

1. **Port Conflicts**:
   - Standalone: Uses container networking only
   - Full: Ollama on port 11434
   - Test: Ollama on port 11435 (avoids conflicts)

2. **Memory Issues**:
   - Reduce model size: Use `llama3.2:1b` instead of `qwen2.5:7b`
   - Configure Docker memory limits

3. **Model Download Issues**:
   - Check internet connection
   - Verify Ollama container has sufficient disk space
   - Try pulling models manually

4. **Network Issues**:
   - Test environment uses external networks to prevent conflicts
   - Ensure Docker has internet access for model downloads

### Diagnostic Commands

```bash
# Check container status
docker-compose ps

# View container logs
docker-compose logs [service-name]

# Check network connectivity
docker-compose exec courtlistener-mcp ping ollama

# Check API token configuration
docker-compose exec courtlistener-mcp env | grep COURTLISTENER

# Test MCP server directly
docker-compose exec courtlistener-mcp node -e "console.log('MCP Server OK')"
```

## 🚧 Migration from Previous Versions

If you're upgrading from previous Docker configurations:

1. **Update environment file**:
   ```bash
   cp .env.example .env.new
   # Merge your existing values
   ```

2. **Clean up old networks** (if needed):
   ```bash
   docker network rm courtlistener_integration_net 2>/dev/null || true
   ```

3. **Update test scripts**:
   ```bash
   # Old network name is automatically updated
   ./scripts/test-docker.sh integration
   ```

## 🔮 Future Enhancements

- **Cloud Integration**: Direct integration with cloud AI services (OpenAI, Anthropic, etc.)
- **Model Management**: Automatic model optimization and caching
- **Scaling**: Multi-container deployment support
- **Monitoring**: Built-in observability and metrics

---

> **Note**: This system is currently built around Ollama for local AI functionality. Cloud-based integrations are coming soon to provide additional deployment options.
