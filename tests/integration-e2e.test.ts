/**
 * End-to-End Integration Tests for CourtListener MCP + Ollama
 * 
 * These tests verify the complete workflow:
 * 1. Start MCP server
 * 2. Connect Ollama with MCP tools
 * 3. Ask questions that provoke tool usage
 * 4. Verify tools are called and results incorporated
 */

import { spawn, ChildProcess } from 'child_process';

const OLLAMA_HOST = process.env.OLLAMA_HOST || 'http://localhost:11434';

interface OllamaResponse {
  message: {
    role: string;
    content: string;
    tool_calls?: Array<{
      function: {
        name: string;
        arguments: string | object;
      };
    }>;
  };
  done: boolean;
}

interface MCPTool {
  name: string;
  description: string;
  inputSchema: any;
}

describe('CourtListener MCP + Ollama E2E Integration', () => {
  let mcpProcess: ChildProcess | null = null;
  let ollamaAvailable = false;
  let skipReason = '';
  let mcpTools: MCPTool[] = [];
  let ollamaMCPTools: any[] = [];
  let responses: Record<string, any> = {};
  let requestId = 1;
  let selectedModel = '';

  const sendMCPRequest = (method: string, params?: any) => {
    if (!mcpProcess) throw new Error('MCP process not started');
    
    const request = {
      jsonrpc: '2.0',
      id: requestId++,
      method,
      params
    };
    
    mcpProcess.stdin?.write(JSON.stringify(request) + '\n');
    return request.id;
  };

  const waitForMCPResponse = async (id: number, timeoutMs = 10000): Promise<any> => {
    const start = Date.now();
    while (Date.now() - start < timeoutMs) {
      if (responses[id]) {
        return responses[id];
      }
      await new Promise(resolve => setTimeout(resolve, 100));
    }
    throw new Error(`MCP request ${id} timed out after ${timeoutMs}ms`);
  };

  const executeMCPTool = async (toolCall: any): Promise<string> => {
    const mcpToolName = toolCall.function.name.replace(/_/g, '-');
    const args = typeof toolCall.function.arguments === 'string' 
      ? JSON.parse(toolCall.function.arguments)
      : toolCall.function.arguments;
    
    console.log(`   🔧 Executing MCP tool: ${mcpToolName}`);
    
    const toolCallId = sendMCPRequest('tools/call', {
      name: mcpToolName,
      arguments: args
    });
    
    const response = await waitForMCPResponse(toolCallId, 15000);
    
    if (response.error) {
      return `Error: ${response.error.message}`;
    } else {
      return response.result?.content?.[0]?.text || JSON.stringify(response.result) || 'No result';
    }
  };

  const askOllamaWithTools = async (question: string): Promise<{
    finalResponse: string;
    toolsUsed: number;
    conversation: any[];
  }> => {
    const systemMessage = {
      role: "system",
      content: `You are a legal research assistant with access to the CourtListener database.

Available tools:
${mcpTools.map(t => `- ${t.name}: ${t.description}`).join('\n')}

IMPORTANT: When asked about courts, cases, or legal matters, use the appropriate tools to search the database.
Always use get-court-codes first to find correct court abbreviations before searching.`
    };

    const conversation = [
      systemMessage,
      { role: "user", content: question }
    ];

    console.log(`   🤔 Asking Ollama: "${question}"`);

    // First call to Ollama with tools available
    const response = await fetch(`${OLLAMA_HOST}/api/chat`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        model: selectedModel,
        messages: conversation,
        tools: ollamaMCPTools,
        stream: false,
        options: { 
          temperature: 0.1,
          num_predict: 2000
        }
      })
    });

    if (!response.ok) {
      throw new Error(`Ollama request failed: ${response.status}`);
    }

    const result: OllamaResponse = await response.json();
    let toolsUsed = 0;
    let finalResponse = result.message.content;

    // Check if Ollama wants to use tools
    if (result.message.tool_calls && result.message.tool_calls.length > 0) {
      console.log(`   🛠️  Ollama wants to use ${result.message.tool_calls.length} tools`);
      toolsUsed = result.message.tool_calls.length;

      // Execute each tool call via MCP
      const toolResults: any[] = [];
      for (const toolCall of result.message.tool_calls) {
        const toolResult = await executeMCPTool(toolCall);
        toolResults.push({
          role: "tool",
          content: toolResult
        });
      }

      // Get final response with tool results
      const finalMessages = [
        systemMessage,
        { role: "user", content: question },
        result.message,
        ...toolResults
      ];

      console.log('   🧠 Getting final response with tool results...');

      const finalCall = await fetch(`${OLLAMA_HOST}/api/chat`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          model: selectedModel,
          messages: finalMessages,
          stream: false,
          options: { temperature: 0.3, num_predict: 1000 }
        })
      });

      if (finalCall.ok) {
        const finalResult: OllamaResponse = await finalCall.json();
        finalResponse = finalResult.message.content;
      }
    } else {
      console.log('   ⚠️  Ollama did not use any tools');
    }

    return {
      finalResponse,
      toolsUsed,
      conversation
    };
  };

  beforeAll(async () => {
    // Check Ollama availability
    try {
      const response = await fetch(`${OLLAMA_HOST}/api/tags`);
      if (response.ok) {
        ollamaAvailable = true;
        const data = await response.json();
        
        // Prefer function calling models
        const functionCallingModels = ['qwen2.5:7b', 'qwen2.5', 'llama3.1:8b', 'llama3.1'];
        const availableModels = data.models.map((m: any) => m.name);
        selectedModel = functionCallingModels.find(m => availableModels.includes(m)) || availableModels[0];
        
        console.log(`✅ Ollama available at ${OLLAMA_HOST}`);
        console.log(`📋 Selected model: ${selectedModel} (from ${availableModels.length} available)`);
      } else {
        skipReason = `Ollama returned ${response.status} at ${OLLAMA_HOST}`;
      }
    } catch (error) {
      skipReason = `Ollama not available at ${OLLAMA_HOST}`;
    }

    // Start MCP server
    if (ollamaAvailable) {
      console.log('🚀 Starting MCP server...');
      
      const isDocker = process.env.DOCKER_CONTAINER === 'true';
      const mcpPath = isDocker ? './build/index.js' : './build/index.js';
      
      mcpProcess = spawn('node', [mcpPath], {
        stdio: ['pipe', 'pipe', 'pipe'],
        env: { ...process.env, NODE_ENV: 'test', DOCKER_CONTAINER: 'true' }
      });

      // Handle MCP responses
      mcpProcess.stdout?.on('data', (data) => {
        const lines = data.toString().split('\n').filter((line: string) => line.trim());
        for (const line of lines) {
          try {
            const response = JSON.parse(line);
            if (response.id) {
              responses[response.id] = response;
            }
          } catch (e) {
            // Ignore non-JSON output
          }
        }
      });

      mcpProcess.stderr?.on('data', (data) => {
        console.error(`MCP stderr: ${data}`);
      });

      // Wait for MCP startup
      await new Promise(resolve => setTimeout(resolve, 3000));

      // Initialize MCP
      console.log('🔧 Initializing MCP connection...');
      const initId = sendMCPRequest('initialize', {
        protocolVersion: '2024-11-05',
        capabilities: {},
        clientInfo: { name: 'E2E-Integration-Test', version: '1.0.0' }
      });

      const initResponse = await waitForMCPResponse(initId);
      if (initResponse.error) {
        throw new Error(`MCP initialization failed: ${initResponse.error.message}`);
      }

      // Get MCP tools
      const toolsId = sendMCPRequest('tools/list');
      const toolsResponse = await waitForMCPResponse(toolsId);
      
      if (toolsResponse.error) {
        throw new Error(`Failed to get MCP tools: ${toolsResponse.error.message}`);
      }

      mcpTools = toolsResponse.result.tools;
      
      // Convert tools to Ollama format
      ollamaMCPTools = mcpTools.map(tool => ({
        type: "function",
        function: {
          name: tool.name.replace(/-/g, '_'),
          description: tool.description,
          parameters: tool.inputSchema
        }
      }));

      console.log(`✅ MCP initialized with ${mcpTools.length} tools`);
    }
  }, 30000);

  afterAll(() => {
    if (mcpProcess) {
      mcpProcess.kill();
    }
  });

  test('should get federal court codes when asked about federal courts', async () => {
    if (!ollamaAvailable || !mcpProcess) {
      console.log(`   ⏭️  Skipped: ${skipReason || 'MCP not initialized'}`);
      return;
    }

    const result = await askOllamaWithTools(
      "What are the federal court codes available? I need to know the abbreviations for federal courts."
    );

    // Verify tools were used
    expect(result.toolsUsed).toBeGreaterThan(0);
    console.log(`   ✅ Used ${result.toolsUsed} tools`);

    // Verify response contains court codes
    expect(result.finalResponse.toLowerCase()).toMatch(/court|federal|scotus|ca\d+/);
    console.log(`   ✅ Response contains court information`);

    // Response should be substantial
    expect(result.finalResponse.length).toBeGreaterThan(50);
    
    console.log(`   📝 Response preview: ${result.finalResponse.substring(0, 150)}...`);
  }, 45000);

  test('should search for Supreme Court cases when asked about landmark cases', async () => {
    if (!ollamaAvailable || !mcpProcess) {
      console.log(`   ⏭️  Skipped: ${skipReason || 'MCP not initialized'}`);
      return;
    }

    const result = await askOllamaWithTools(
      "Find me some recent Supreme Court cases about technology or privacy. Search the database for cases."
    );

    // Verify tools were used
    expect(result.toolsUsed).toBeGreaterThan(0);
    console.log(`   ✅ Used ${result.toolsUsed} tools`);

    // Response should mention cases or legal terms
    expect(result.finalResponse.toLowerCase()).toMatch(/case|court|ruling|decision|opinion/);
    console.log(`   ✅ Response contains legal case information`);

    // Should be a substantial response
    expect(result.finalResponse.length).toBeGreaterThan(100);
    
    console.log(`   📝 Response preview: ${result.finalResponse.substring(0, 150)}...`);
  }, 60000);

  test('should search specific court dockets when asked about court cases', async () => {
    if (!ollamaAvailable || !mcpProcess) {
      console.log(`   ⏭️  Skipped: ${skipReason || 'MCP not initialized'}`);
      return;
    }

    const result = await askOllamaWithTools(
      "Search for cases in the Northern District of California about artificial intelligence or technology. Look up the court code and search dockets."
    );

    // Verify tools were used
    expect(result.toolsUsed).toBeGreaterThan(0);
    console.log(`   ✅ Used ${result.toolsUsed} tools`);

    // Should mention specific court or dockets
    expect(result.finalResponse.toLowerCase()).toMatch(/docket|northern district|california|cand|technology|artificial intelligence/);
    console.log(`   ✅ Response contains specific court/docket information`);

    console.log(`   📝 Response preview: ${result.finalResponse.substring(0, 150)}...`);
  }, 60000);

  test('should handle tool errors gracefully', async () => {
    if (!ollamaAvailable || !mcpProcess) {
      console.log(`   ⏭️  Skipped: ${skipReason || 'MCP not initialized'}`);
      return;
    }

    const result = await askOllamaWithTools(
      "Search for cases with an invalid court code 'INVALID_COURT' and see what happens."
    );

    // Tool should still be called even if it errors
    expect(result.toolsUsed).toBeGreaterThan(0);
    console.log(`   ✅ Tool was called despite invalid parameters`);

    // Response should handle the error case
    expect(result.finalResponse.length).toBeGreaterThan(20);
    console.log(`   ✅ Graceful error handling in response`);

    console.log(`   📝 Response preview: ${result.finalResponse.substring(0, 150)}...`);
  }, 45000);

  test('should work without tools for general questions', async () => {
    if (!ollamaAvailable || !mcpProcess) {
      console.log(`   ⏭️  Skipped: ${skipReason || 'MCP not initialized'}`);
      return;
    }

    const result = await askOllamaWithTools(
      "What is the weather like today?"
    );

    // This question shouldn't trigger tools
    expect(result.toolsUsed).toBe(0);
    console.log(`   ✅ No tools used for general question`);

    // Should still provide a response
    expect(result.finalResponse.length).toBeGreaterThan(10);
    console.log(`   ✅ Provided general response without tools`);

    console.log(`   📝 Response: ${result.finalResponse}`);
  }, 30000);
});
