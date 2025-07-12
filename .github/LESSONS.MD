# Lessons Learned

## Docker & Alpine Linux

### Lesson: Don't install bash on Alpine containers, use sh instead
**Date**: July 12, 2025  
**Issue**: Entrypoint script used `#!/bin/bash` but Alpine Linux doesn't have bash by default  
**Mistake**: Initially tried to install bash in Dockerfile instead of changing script  
**Resolution**: Changed `#!/bin/bash` to `#!/bin/sh` in docker-entrypoint.sh  
**Prevention**: Always use `sh` for Alpine containers, it's POSIX compliant and available by default  

### Lesson: Docker Compose ContainerConfig errors require cleanup
**Date**: July 12, 2025  
**Issue**: Docker Compose throws 'ContainerConfig' KeyError when containers are in inconsistent state  
**Resolution**: Clean up orphaned containers and rebuild from scratch  
**Prevention**: Always use `--remove-orphans` flag and clean builds when debugging container issues  

### Lesson: MCP Server Health Checks Need Special Handling
**Date**: July 12, 2025  
**Issue**: MCP servers run on stdio transport and wait for input, simple health checks fail  
**Problem**: Server container exits because health check doesn't understand stdio server behavior  
**Investigation**: Need proper MCP protocol health check, not just node execution test  
**Prevention**: Health checks for MCP servers must test actual MCP communication over stdio

### Lesson: Docker Service Name Resolution for Ollama Integration
**Date**: July 12, 2025  
**Issue**: External service reference `ai_ollama:11434` doesn't work inside Docker Compose networks  
**Problem**: Docker Compose uses internal service names, not external swarm service names  
**Solution**: Include Ollama service in test compose and reference as `ollama:11434`  
**Implementation**: Added local Ollama service to docker-compose.test.yml with smallest function-calling model  
**Prevention**: Always use service names for internal Docker Compose communication, external references for cross-stack  

### Lesson: Smart Container Cleanup During Development
**Date**: July 12, 2025  
**Issue**: Repeatedly destroying healthy containers (especially Ollama) wastes time and resources  
**Problem**: Ollama takes 5+ minutes to download models, full cleanup destroys this work unnecessarily  
**Investigation**: Need smart cleanup that preserves healthy containers but cleans networks/volumes to prevent conflicts  
**Solution**: Implement tiered cleanup - preserve healthy containers, only destroy when forcing rebuild or on code changes  
**Prevention**: Always clean up dangling images, networks, and volumes between builds, but preserve working containers when possible  

### Lesson: Network Configuration Conflicts Require Full Cleanup
**Date**: July 12, 2025  
**Issue**: Docker network recreation errors when changing IPv6/IPv4 settings mid-development  
**Problem**: Docker caches network configurations and can't update them with active containers  
**Solution**: Do full cleanup before significant network configuration changes  
**Implementation**: Use `full-cleanup` command to remove everything, then rebuild from scratch  
**Prevention**: Test network configs in isolated environments, avoid changing core network settings during active development  

### Lesson: Separate Cleanup Commands for Development Efficiency
**Date**: July 12, 2025  
**Issue**: Auto-cleanup in test scripts removes containers needed for iterative testing  
**Problem**: Developers want to run tests multiple times but preserve expensive resources like Ollama models  
**Solution**: Remove all auto-cleanup from test commands, provide explicit cleanup commands instead  
**Implementation**: `cleanup` (preserve volumes), `full-cleanup` (remove everything), explicit calls only  
**Prevention**: Never auto-clean during development, always let users decide when to clean resources  

## Project Organization

### Lesson: Working software is #1 priority
**Principle**: Never compromise working functionality for convenience  
**Application**: All changes must maintain or improve functionality  

### Lesson: Security first approach
**Principle**: Always consider security implications of any change  
**Application**: Secure environment handling, proper permissions, minimal attack surface  

### Lesson: Test everything
**Principle**: All code must pass functional and regression testing  
**Application**: Docker integration tests, MCP server validation, comprehensive test coverage  
