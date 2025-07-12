import { describe, test, expect, beforeAll, afterAll } from '@jest/globals';
import { spawn } from 'child_process';

describe('Docker MCP Integration Tests', () => {
  let mcpProcess: any;
  let requestId = 1;

  const sendMCPRequest = async (method: string, params = {}) => {
    const request = {
      jsonrpc: '2.0',
      id: requestId++,
      method,
      params
    };

    return new Promise((resolve, reject) => {
      const timeout = setTimeout(() => {
        reject(new Error(`Request timeout for ${method}`));
      }, 20000);

      const onData = (data: Buffer) => {
        try {
          const lines = data.toString().split('\n').filter(line => line.trim());
          for (const line of lines) {
            const response = JSON.parse(line);
            if (response.id === request.id) {
              clearTimeout(timeout);
              mcpProcess.stdout.removeListener('data', onData);
              resolve(response);
              return;
            }
          }
        } catch (e) {
          // Continue listening for more data
        }
      };

      mcpProcess.stdout.on('data', onData);
      mcpProcess.stdin.write(JSON.stringify(request) + '\n');
    });
  };

  beforeAll(async () => {
    console.log('🐳 Starting Docker MCP Integration Tests');
    
    // Check if we're in Docker and should connect to containerized MCP server
    const mcpServerContainer = process.env.MCP_SERVER_CONTAINER;
    
    if (mcpServerContainer) {
      console.log(`📡 Connecting to MCP server container: ${mcpServerContainer}`);
      
      // Connect to MCP server running in another container
      mcpProcess = spawn('docker', [
        'exec', '-i', mcpServerContainer, 
        'node', '/app/build/index.js'
      ], {
        stdio: ['pipe', 'pipe', 'pipe']
      });
    } else {
      console.log('🔧 Starting local MCP server process');
      
      // Fallback to local process
      mcpProcess = spawn('node', ['build/index.js'], {
        stdio: ['pipe', 'pipe', 'pipe'],
        cwd: process.cwd()
      });
    }

    // Handle errors
    mcpProcess.stderr.on('data', (data: Buffer) => {
      console.error('MCP Server Error:', data.toString());
    });

    mcpProcess.on('error', (error: Error) => {
      console.error('Failed to start MCP process:', error);
    });

    // Wait for server to be ready
    console.log('⏳ Waiting for MCP server startup...');
    await new Promise(resolve => setTimeout(resolve, 3000));

    // Initialize MCP connection
    console.log('🔧 Initializing MCP connection...');
    const initResponse = await sendMCPRequest('initialize', {
      protocolVersion: '2024-11-05',
      capabilities: {},
      clientInfo: {
        name: 'Docker Test Client',
        version: '1.0.0'
      }
    });

    expect((initResponse as any).result).toBeDefined();
    console.log('✅ MCP connection initialized');
  }, 30000);

  afterAll(() => {
    if (mcpProcess) {
      mcpProcess.kill();
    }
  });

  test('MCP server responds to tools/list in Docker environment', async () => {
    console.log('🔍 Testing tools/list endpoint...');
    
    const response = await sendMCPRequest('tools/list') as any;
    
    expect(response.result).toBeDefined();
    expect(response.result.tools).toBeDefined();
    expect(Array.isArray(response.result.tools)).toBe(true);
    expect(response.result.tools.length).toBeGreaterThan(0);
    
    // Check for key tools
    const toolNames = response.result.tools.map((t: any) => t.name);
    expect(toolNames).toContain('search-dockets');
    expect(toolNames).toContain('search-opinions');
    expect(toolNames).toContain('get-court');
    expect(toolNames).toContain('get-court-codes');
    
    console.log(`✅ Found ${response.result.tools.length} MCP tools`);
  });

  test('Can search for dockets via Docker MCP', async () => {
    console.log('🔍 Testing docket search...');
    
    const response = await sendMCPRequest('tools/call', {
      name: 'search-dockets',
      arguments: {
        court: 'scotus',
        page_size: 1
      }
    }) as any;

    expect(response.result).toBeDefined();
    expect(response.result.content).toBeDefined();
    expect(Array.isArray(response.result.content)).toBe(true);
    expect(response.result.content.length).toBeGreaterThan(0);
    
    const content = response.result.content[0];
    expect(content.type).toBe('text');
    expect(content.text).toContain('Supreme Court');
    
    console.log('✅ Docket search successful');
  });

  test('Can get court information via Docker MCP', async () => {
    console.log('🔍 Testing court information...');
    
    const response = await sendMCPRequest('tools/call', {
      name: 'get-court',
      arguments: {
        id: 'scotus'
      }
    }) as any;

    expect(response.result).toBeDefined();
    expect(response.result.content).toBeDefined();
    expect(Array.isArray(response.result.content)).toBe(true);
    
    const content = response.result.content[0];
    expect(content.type).toBe('text');
    expect(content.text).toContain('Supreme Court');
    expect(content.text).toContain('United States');
    
    console.log('✅ Court information retrieval successful');
  });

  test('Ollama integration availability in Docker network', async () => {
    console.log('🔍 Testing Ollama connectivity...');
    
    const ollamaHost = process.env.OLLAMA_HOST || 'http://localhost:11434';
    console.log(`📡 Checking Ollama at: ${ollamaHost}`);
    
    try {
      const response = await fetch(`${ollamaHost}/api/tags`);
      if (response.ok) {
        const data = await response.json() as { models: any[] };
        console.log('✅ Ollama is accessible from Docker container');
        console.log(`📋 Available models: ${data.models.map(m => m.name).join(', ')}`);
        expect(data.models).toBeDefined();
        
        // Test that we can reach Ollama for function calling
        if (data.models.length > 0) {
          console.log('🎯 Docker network setup allows MCP ↔ Ollama integration');
        }
      } else {
        console.log(`⚠️  Ollama returned status: ${response.status}`);
      }
    } catch (error: any) {
      console.log(`ℹ️  Ollama not accessible: ${error.message}`);
      console.log('   This is expected if Ollama is not running in the test environment');
      // This is not a failure, just informational
    }
  }, 15000);
});
