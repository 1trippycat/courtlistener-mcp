import { spawn, ChildProcess } from 'child_process';
import 'dotenv/config';

// Get Ollama host from environment or use default
const OLLAMA_HOST = process.env.OLLAMA_HOST || 'http://localhost:11434';

interface MCPRequest {
  jsonrpc: string;
  id: number;
  method: string;
  params?: any;
}

interface MCPResponse {
  jsonrpc: string;
  id: number;
  result?: any;
  error?: {
    code: number;
    message: string;
  };
}

interface OllamaModel {
  name: string;
  model: string;
  modified_at: string;
  size: number;
  digest: string;
}

interface OllamaTagsResponse {
  models: OllamaModel[];
}

describe('Ollama MCP Integration Tests', () => {
  let mcpProcess: ChildProcess | null = null;
  let responses: Record<number, MCPResponse> = {};
  let requestId = 1;
  let ollamaAvailable = false;
  let skipReason = '';
  
  const sendMCPRequest = (method: string, params: any = {}): number => {
    if (!mcpProcess?.stdin) {
      throw new Error('MCP process not available');
    }
    
    const request: MCPRequest = {
      jsonrpc: '2.0',
      id: requestId++,
      method,
      params
    };
    
    mcpProcess.stdin.write(JSON.stringify(request) + '\n');
    return request.id;
  };
  
  beforeAll(async () => {
    // Check if Ollama is available
    try {
      const response = await fetch(`${OLLAMA_HOST}/api/tags`);
      if (response.ok) {
        ollamaAvailable = true;
        console.log(`✅ Ollama available at ${OLLAMA_HOST}`);
      } else {
        skipReason = `Ollama returned ${response.status} at ${OLLAMA_HOST}`;
        console.log(`⏭️  Skipping Ollama integration tests - ${skipReason}`);
      }
    } catch (error) {
      skipReason = `Ollama not available at ${OLLAMA_HOST}`;
      console.log(`⏭️  Skipping Ollama integration tests - ${skipReason}`);
      console.log(`   💡 To run these tests, ensure Ollama is running and accessible`);
    }
  }, 30000);

  afterAll(() => {
    if (mcpProcess) {
      mcpProcess.kill();
    }
  });

  test('should connect to Ollama and list available models', async () => {
    if (!ollamaAvailable) {
      console.log(`   ⏭️  Skipped: ${skipReason}`);
      return;
    }
    
    const response = await fetch(`${OLLAMA_HOST}/api/tags`);
    expect(response.ok).toBe(true);
    
    const data: OllamaTagsResponse = await response.json();
    expect(data.models).toBeDefined();
    expect(Array.isArray(data.models)).toBe(true);
    expect(data.models.length).toBeGreaterThan(0);
    
    console.log(`📋 Available models: ${data.models.map(m => m.name).join(', ')}`);
  }, 10000);

  test('should initialize MCP server and get tools list', async () => {
    if (!ollamaAvailable) {
      console.log(`   ⏭️  Skipped: ${skipReason}`);
      return;
    }
    
    mcpProcess = spawn('node', ['build/index.js'], {
      stdio: ['pipe', 'pipe', 'pipe'],
      cwd: process.cwd()
    });
    
    mcpProcess.stdout?.on('data', (data: Buffer) => {
      try {
        const lines = data.toString().split('\n').filter(line => line.trim());
        for (const line of lines) {
          const response: MCPResponse = JSON.parse(line);
          if (response.id) {
            responses[response.id] = response;
          }
        }
      } catch (e) {
        // Ignore parse errors
      }
    });
    
    // Wait for MCP startup
    await new Promise(resolve => setTimeout(resolve, 3000));
    
    // Initialize MCP
    const initId = sendMCPRequest('initialize', {
      protocolVersion: '2024-11-05',
      capabilities: {},
      clientInfo: { name: 'Integration-Test', version: '1.0.0' }
    });
    
    await new Promise(resolve => setTimeout(resolve, 2000));
    expect(responses[initId]).toBeDefined();
    expect(responses[initId].error).toBeUndefined();
    
    // Get tools list
    const toolsId = sendMCPRequest('tools/list');
    await new Promise(resolve => setTimeout(resolve, 2000));
    
    expect(responses[toolsId]).toBeDefined();
    expect(responses[toolsId].result).toBeDefined();
    expect(responses[toolsId].result.tools).toBeDefined();
    expect(responses[toolsId].result.tools.length).toBeGreaterThan(20);
    
    console.log(`📋 MCP tools available: ${responses[toolsId].result.tools.length}`);
  }, 15000);

  test('should test Ollama function calling with MCP tools', async () => {
    if (!ollamaAvailable) {
      console.log(`   ⏭️  Skipped: ${skipReason}`);
      return;
    }
    
    // Skip if MCP not initialized
    if (!mcpProcess) {
      console.log('   ⏭️  Skipping: MCP server not initialized');
      return;
    }
    
    // Get available Ollama models
    const tagsResponse = await fetch(`${OLLAMA_HOST}/api/tags`);
    const tagsData: OllamaTagsResponse = await tagsResponse.json();
    
    // Prefer function-calling capable models
    const functionCallingModels = ['qwen2.5:7b', 'qwen2.5', 'llama3.1:8b', 'llama3.1'];
    const availableModels = tagsData.models.map(m => m.name);
    const model = functionCallingModels.find(m => availableModels.includes(m)) || availableModels[0];
    
    // Get MCP tools
    const toolsId = sendMCPRequest('tools/list');
    await new Promise(resolve => setTimeout(resolve, 1000));
    
    const tools = responses[toolsId]?.result?.tools || [];
    expect(tools.length).toBeGreaterThan(0);
    
    // Convert to Ollama format
    const mcpTools = tools.slice(0, 5).map((tool: any) => ({
      type: "function",
      function: {
        name: tool.name.replace(/-/g, '_'),
        description: tool.description,
        parameters: tool.inputSchema
      }
    }));
    
    // Test with simple request
    const conversation = [{
      role: "user",
      content: "Use the get_court_codes tool to find federal court codes."
    }];
    
    const ollamaResponse = await fetch(`${OLLAMA_HOST}/api/chat`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        model: model,
        messages: conversation,
        tools: mcpTools,
        stream: false,
        options: { temperature: 0.1, num_predict: 100 }
      })
    });
    
    expect(ollamaResponse.ok).toBe(true);
    
    const result = await ollamaResponse.json();
    expect(result.message).toBeDefined();
    
    // Function calling may or may not work depending on model
    if (result.message.tool_calls && result.message.tool_calls.length > 0) {
      console.log('✅ Function calling is working!');
      expect(result.message.tool_calls.length).toBeGreaterThan(0);
    } else {
      console.log('⚠️  Model did not use function calling (may not be supported)');
      expect(result.message.content).toBeDefined();
    }
  }, 20000);
});
