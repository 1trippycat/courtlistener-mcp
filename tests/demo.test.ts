import { describe, test, expect, beforeAll, afterAll } from '@jest/globals';
import { spawn } from 'child_process';

describe('Demo Integration Tests', () => {
  let mcpProcess;
  let requestId = 1;

  const sendMCPRequest = async (method, params = {}) => {
    const request = {
      jsonrpc: '2.0',
      id: requestId++,
      method,
      params
    };

    return new Promise((resolve, reject) => {
      const timeout = setTimeout(() => {
        reject(new Error(`Request timeout for ${method}`));
      }, 15000); // Increased timeout

      const onData = (data) => {
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
    // Start MCP server
    mcpProcess = spawn('node', ['build/index.js'], {
      stdio: ['pipe', 'pipe', 'pipe'],
      cwd: process.cwd()
    });

    // Add error handling
    mcpProcess.stderr.on('data', (data) => {
      console.error('MCP Server Error:', data.toString());
    });

    // Wait for server to be ready
    await new Promise(resolve => setTimeout(resolve, 2000));

    // Initialize
    await sendMCPRequest('initialize', {
      protocolVersion: '2024-11-05',
      capabilities: {},
      clientInfo: {
        name: 'Demo Test',
        version: '1.0.0'
      }
    });
  }, 20000);

  afterAll(() => {
    if (mcpProcess) {
      mcpProcess.kill();
    }
  });

  test('MCP server responds to tools/list', async () => {
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
  });

  test('Can search for dockets via MCP', async () => {
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
  });

  test('Can get court information via MCP', async () => {
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
  });

  test('Can get court codes via MCP', async () => {
    const response = await sendMCPRequest('tools/call', {
      name: 'get-court-codes',
      arguments: {
        jurisdiction: 'federal'
      }
    }) as any;

    expect(response.result).toBeDefined();
    expect(response.result.content).toBeDefined();
    expect(response.result.content[0]).toBeDefined();
    expect(response.result.content[0].text).toBeDefined();
    expect(response.result.content[0].text).toContain('scotus');
    expect(response.result.content[0].text).toContain('Supreme Court');
  }, 10000);

  test('Check if Ollama is available for integration', async () => {
    try {
      const response = await fetch('http://localhost:11434/api/tags');
      if (response.ok) {
        console.log('✅ Ollama is available for integration testing');
        const data = await response.json() as { models: any[] };
        expect(data.models).toBeDefined();
      }
    } catch (error) {
      console.log('ℹ️  Ollama not running - integration demo will show setup instructions');
      // This is not a failure, just informational
    }
  });
});
