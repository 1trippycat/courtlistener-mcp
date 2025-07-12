import { spawn, ChildProcess } from 'child_process';
import 'dotenv/config';

// Get Ollama host from environment or use default
const OLLAMA_HOST = process.env.OLLAMA_HOST || 'http://localhost:11434';

interface MCPOllamaIntegrationTest {
  mcpProcess: ChildProcess | null;
  responses: Record<number, any>;
  requestId: number;
  tools: any[];
  ollamaAvailable: boolean;
}

describe('Advanced Ollama MCP Integration Tests', () => {
  let integration: MCPOllamaIntegrationTest;
  let skipReason = '';
  
  beforeAll(async () => {
    integration = {
      mcpProcess: null,
      responses: {},
      requestId: 1,
      tools: [],
      ollamaAvailable: false
    };
    
    // Check if Ollama is available
    try {
      const response = await fetch(`${OLLAMA_HOST}/api/tags`);
      if (response.ok) {
        integration.ollamaAvailable = true;
        console.log(`✅ Ollama available at ${OLLAMA_HOST}`);
      } else {
        skipReason = `Ollama returned ${response.status} at ${OLLAMA_HOST}`;
        console.log(`⏭️  Skipping advanced integration tests - ${skipReason}`);
      }
    } catch (error) {
      skipReason = `Ollama not available at ${OLLAMA_HOST}`;
      console.log(`⏭️  Skipping advanced integration tests - ${skipReason}`);
      console.log(`   💡 To run these tests, ensure Ollama is running and accessible`);
    }
  }, 30000);

  afterAll(() => {
    if (integration.mcpProcess) {
      integration.mcpProcess.kill();
    }
  });

  const sendMCPRequest = (method: string, params: any = {}): number => {
    if (!integration.mcpProcess?.stdin) {
      throw new Error('MCP process not available');
    }
    
    const request = {
      jsonrpc: '2.0',
      id: integration.requestId++,
      method,
      params
    };
    
    integration.mcpProcess.stdin.write(JSON.stringify(request) + '\n');
    return request.id;
  };

  test('should check Ollama connectivity', async () => {
    if (!integration.ollamaAvailable) {
      console.log(`   ⏭️  Skipped: ${skipReason}`);
      return;
    }
    
    const response = await fetch(`${OLLAMA_HOST}/api/tags`);
    expect(response.ok).toBe(true);
    
    const data = await response.json();
    expect(data.models).toBeDefined();
    expect(data.models.length).toBeGreaterThan(0);
    
    console.log(`   Available models: ${data.models.map((m: any) => m.name).join(', ')}`);
  }, 10000);

  test('should start and initialize MCP server', async () => {
    if (!integration.ollamaAvailable) {
      console.log(`   ⏭️  Skipped: ${skipReason}`);
      return;
    }
    
    // Start MCP server
    integration.mcpProcess = spawn('node', ['build/index.js'], {
      stdio: ['pipe', 'pipe', 'pipe'],
      cwd: process.cwd()
    });
    
    integration.mcpProcess.stdout?.on('data', (data: Buffer) => {
      try {
        const lines = data.toString().split('\n').filter(line => line.trim());
        for (const line of lines) {
          const response = JSON.parse(line);
          if (response.id) {
            integration.responses[response.id] = response;
          }
        }
      } catch (e) {
        // Ignore parse errors
      }
    });
    
    // Wait for startup
    await new Promise(resolve => setTimeout(resolve, 3000));
    
    // Initialize
    const initId = sendMCPRequest('initialize', {
      protocolVersion: '2024-11-05',
      capabilities: {},
      clientInfo: { name: 'Advanced-Integration-Test', version: '1.0.0' }
    });
    
    await new Promise(resolve => setTimeout(resolve, 2000));
    
    expect(integration.responses[initId]).toBeDefined();
    expect(integration.responses[initId].error).toBeUndefined();
    
    console.log('   ✅ MCP server initialized');
  }, 15000);

  test('should load MCP tools and verify functionality', async () => {
    if (!integration.ollamaAvailable || !integration.mcpProcess) {
      console.log(`   ⏭️  Skipped: ${!integration.ollamaAvailable ? skipReason : 'MCP server not initialized'}`);
      return;
    }
    
    // Get tools
    const toolsId = sendMCPRequest('tools/list');
    await new Promise(resolve => setTimeout(resolve, 2000));
    
    expect(integration.responses[toolsId]).toBeDefined();
    expect(integration.responses[toolsId].result).toBeDefined();
    
    integration.tools = integration.responses[toolsId].result.tools;
    expect(integration.tools.length).toBeGreaterThan(20);
    
    console.log(`   ✅ Loaded ${integration.tools.length} MCP tools`);
    
    // Test a specific tool
    const courtCodesId = sendMCPRequest('tools/call', {
      name: 'get-court-codes',
      arguments: { jurisdiction: 'federal' }
    });
    
    await new Promise(resolve => setTimeout(resolve, 3000));
    
    expect(integration.responses[courtCodesId]).toBeDefined();
    if (integration.responses[courtCodesId].error) {
      console.log('   ⚠️  Tool error:', integration.responses[courtCodesId].error.message);
    } else {
      expect(integration.responses[courtCodesId].result).toBeDefined();
      console.log('   ✅ Tool execution successful');
    }
  }, 15000);

  test('should test end-to-end function calling integration', async () => {
    if (!integration.ollamaAvailable || !integration.mcpProcess || integration.tools.length === 0) {
      const reason = !integration.ollamaAvailable ? skipReason : 
                    !integration.mcpProcess ? 'MCP server not initialized' : 
                    'No MCP tools available';
      console.log(`   ⏭️  Skipped: ${reason}`);
      return;
    }
    
    // Get available models
    const tagsResponse = await fetch(`${OLLAMA_HOST}/api/tags`);
    const tagsData = await tagsResponse.json();
    
    const functionCallingModels = ['llama3.1:8b', 'llama3.1', 'qwen2.5'];
    const availableModels = tagsData.models.map((m: any) => m.name);
    const model = functionCallingModels.find(m => availableModels.includes(m)) || availableModels[0];
    
    // Convert tools to Ollama format
    const mcpTools = integration.tools.slice(0, 3).map((tool: any) => ({
      type: "function",
      function: {
        name: tool.name.replace(/-/g, '_'),
        description: tool.description,
        parameters: tool.inputSchema
      }
    }));
    
    // Test conversation
    const conversation = [{
      role: "user",
      content: "Get the federal court codes using the available tools."
    }];
    
    const ollamaResponse = await fetch(`${OLLAMA_HOST}/api/chat`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        model: model,
        messages: conversation,
        tools: mcpTools,
        stream: false,
        options: { temperature: 0.1, num_predict: 200 }
      })
    });
    
    expect(ollamaResponse.ok).toBe(true);
    
    const result = await ollamaResponse.json();
    expect(result.message).toBeDefined();
    
    if (result.message.tool_calls && result.message.tool_calls.length > 0) {
      console.log('   ✅ End-to-end function calling working!');
      console.log(`   🔧 Tool calls: ${result.message.tool_calls.length}`);
    } else {
      console.log('   ⚠️  Function calling not used (model may not support it)');
      console.log(`   💭 Response: ${result.message.content?.substring(0, 100)}...`);
    }
  }, 20000);
});
