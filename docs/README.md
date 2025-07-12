# Documentation Index

This directory contains comprehensive documentation for the CourtListener MCP Server, organized by use case and deployment type.

## 🚀 Getting Started

- **[README.md](../README.md)** - Main project overview and quick start
- **[DOCKER_GUIDE.md](DOCKER_GUIDE.md)** - Complete Docker deployment guide (standalone, full, test configurations)

## 🛠️ Development & Testing

- **[TESTING_GUIDE.md](TESTING_GUIDE.md)** - Development and testing procedures
- **[MCP_INTEGRATION_GUIDE.md](MCP_INTEGRATION_GUIDE.md)** - Integration patterns and examples
- **[DEMO_GUIDE.md](DEMO_GUIDE.md)** - Interactive demonstrations

## 📚 Usage & Examples

- **[QUICK_EXAMPLES.md](QUICK_EXAMPLES.md)** - Common usage patterns and code examples
- **[RECAP_TOOLS.md](RECAP_TOOLS.md)** - PACER/federal court document tools reference

## 🔐 Security & Configuration

- **[SECURITY_SUMMARY.md](SECURITY_SUMMARY.md)** - Security overview and best practices
- **[SECURITY_IMPLEMENTATION_REPORT.md](SECURITY_IMPLEMENTATION_REPORT.md)** - Detailed security implementation

## 🐳 Docker Deployment Types

The CourtListener MCP Server supports three deployment configurations:

### 1. Standalone
- **Purpose**: Basic MCP server without AI integration
- **File**: `docker-compose.yml` (default)
- **Use Cases**: Production deployments, external AI services
- **Resources**: ~100MB RAM, minimal CPU

### 2. Full Stack  
- **Purpose**: Complete development environment with Ollama integration
- **File**: `docker-compose.full.yml`
- **Use Cases**: Local development, demonstrations, self-contained deployments
- **Resources**: ~4GB RAM, GPU recommended
- **Note**: Built around Ollama (cloud integrations coming soon)

### 3. Test Environment
- **Purpose**: Isolated testing with configurable models
- **File**: `docker-compose.test.yml`
- **Use Cases**: Automated testing, CI/CD, development validation
- **Resources**: ~2GB RAM, automated model management

## 🔧 Configuration

All deployments use the same `.env` configuration:

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

## 📖 Quick Reference

| Task | Command | Documentation |
|------|---------|---------------|
| Basic deployment | `docker-compose up -d` | [DOCKER_GUIDE.md](DOCKER_GUIDE.md) |
| Full development | `docker-compose -f docker-compose.full.yml up -d` | [DOCKER_GUIDE.md](DOCKER_GUIDE.md) |
| Run tests | `./scripts/test-docker.sh integration` | [TESTING_GUIDE.md](TESTING_GUIDE.md) |
| Interactive demo | `npm run demo:interactive` | [DEMO_GUIDE.md](DEMO_GUIDE.md) |
| MCP integration | Check examples | [MCP_INTEGRATION_GUIDE.md](MCP_INTEGRATION_GUIDE.md) |

## 🔮 Future Documentation

As the project evolves with cloud integrations:
- Cloud deployment guides
- Multi-provider AI configuration
- Advanced scaling patterns
- Enterprise deployment options

---

> **Note**: This system is currently built around Ollama for local AI functionality. Cloud-based integrations are coming soon to provide additional deployment options.
