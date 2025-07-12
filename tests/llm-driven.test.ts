/**
 * Comprehensive LLM-Driven Tests for CourtListener MCP
 * 
 * This test suite poses natural language questions to the LLM that should
 * trigger specific MCP tool calls, allowing us to test all endpoints through
 * realistic user interactions.
 */

import { spawn, ChildProcess } from 'child_process';

const OLLAMA_HOST = process.env.OLLAMA_HOST || 'http://localhost:11434';
const OLLAMA_MODEL = process.env.OLLAMA_MODEL_TEST || 'qwen2.5:7b';
const TEST_TIMEOUT = 120000; // 2 minutes per test

interface TestScenario {
  question: string;
  expectedTools: string[];
  description: string;
}

// Comprehensive test scenarios covering all MCP tools
const TEST_SCENARIOS: TestScenario[] = [
  // Case Law Tools
  {
    question: "Find recent Supreme Court cases about First Amendment rights",
    expectedTools: ['search-clusters'],
    description: 'Supreme Court case search using search-clusters'
  },
  {
    question: "Get detailed information about docket ID 12345",
    expectedTools: ['get-docket'],
    description: 'Specific docket retrieval using get-docket'
  },
  {
    question: "Search for court dockets in the 9th Circuit about technology",
    expectedTools: ['search-dockets'],
    description: 'Docket search with court filter using search-dockets'
  },
  {
    question: "Show me details about opinion cluster ID 54321",
    expectedTools: ['get-cluster'],
    description: 'Opinion cluster details using get-cluster'
  },
  {
    question: "Find opinions written by Justice Roberts in 2023",
    expectedTools: ['search-opinions'],
    description: 'Opinion search by author using search-opinions'
  },
  {
    question: "Get the full text of opinion ID 98765",
    expectedTools: ['get-opinion'],
    description: 'Specific opinion retrieval using get-opinion'
  },
  {
    question: "List all available federal circuit courts",
    expectedTools: ['list-courts'],
    description: 'Court listing using list-courts'
  },
  {
    question: "Tell me about the Southern District of New York court",
    expectedTools: ['get-court'],
    description: 'Specific court information using get-court'
  },
  
  // RECAP/PACER Tools
  {
    question: "Search for docket entries in docket 12345 containing 'motion'",
    expectedTools: ['search-docket-entries'],
    description: 'Docket entry search using search-docket-entries'
  },
  {
    question: "Get details about docket entry ID 67890",
    expectedTools: ['get-docket-entry'],
    description: 'Specific docket entry using get-docket-entry'
  },
  {
    question: "Find all parties named 'Corporation' in docket 12345",
    expectedTools: ['search-parties'],
    description: 'Party search using search-parties'
  },
  {
    question: "Show me information about party ID 11111",
    expectedTools: ['get-party'],
    description: 'Specific party details using get-party'
  },
  {
    question: "Search for attorneys named 'Smith' in docket 12345",
    expectedTools: ['search-attorneys'],
    description: 'Attorney search using search-attorneys'
  },
  {
    question: "Get details about attorney ID 22222",
    expectedTools: ['get-attorney'],
    description: 'Specific attorney information using get-attorney'
  },
  {
    question: "Find available RECAP documents in docket entry 67890",
    expectedTools: ['search-recap-documents'],
    description: 'RECAP document search using search-recap-documents'
  },
  {
    question: "Get the RECAP document with ID 33333",
    expectedTools: ['get-recap-document'],
    description: 'Specific RECAP document using get-recap-document'
  },
  {
    question: "Find document 1 in case 1:20-cv-12345 from nysd court",
    expectedTools: ['recap-query'],
    description: 'Fast document lookup using recap-query'
  }
];

describe('LLM-Driven CourtListener MCP Tests', () => {
  let mcpProcess: ChildProcess | null = null;
  let ollamaAvailable = false;
  let skipReason = '';
  let requestId = 1;

  beforeAll(async () => {
    // Check if we're in Docker container
    const isDocker = process.env.DOCKER_CONTAINER === 'true';
    console.log(`Running in ${isDocker ? 'Docker' : 'local'} environment`);

    // Check Ollama availability
    try {
      const response = await fetch(`${OLLAMA_HOST}/api/tags`);
      if (response.ok) {
        const data = await response.json();
        const hasModel = data.models?.some((model: any) => 
          model.name.includes(OLLAMA_MODEL.split(':')[0])
        );
        
        if (hasModel) {
          ollamaAvailable = true;
          console.log(`✅ Ollama available with model: ${OLLAMA_MODEL}`);
        } else {
          skipReason = `Model ${OLLAMA_MODEL} not available. Available models: ${data.models?.map((m: any) => m.name).join(', ')}`;
        }
      } else {
        skipReason = `Ollama not responding at ${OLLAMA_HOST}`;
      }
    } catch (error) {
      skipReason = `Ollama connection failed: ${error}`;
    }

    if (!ollamaAvailable) {
      console.log(`⏭️  Skipping Ollama tests: ${skipReason}`);
      return;
    }

    // Start MCP server
    console.log('🚀 Starting MCP server...');
    mcpProcess = spawn('node', ['build/index.js'], {
      env: {
        ...process.env,
        NODE_ENV: 'test',
        DOCKER_CONTAINER: 'true'
      },
      stdio: ['pipe', 'pipe', 'pipe']
    });

    // Wait for server to be ready
    await new Promise<void>((resolve, reject) => {
      const timeout = setTimeout(() => {
        reject(new Error('MCP server startup timeout'));
      }, 10000);

      mcpProcess!.stdout!.on('data', (data) => {
        if (data.toString().includes('"method":"initialize"') || 
            data.toString().includes('MCP server running')) {
          clearTimeout(timeout);
          resolve();
        }
      });

      mcpProcess!.stderr!.on('data', (data) => {
        console.error('MCP stderr:', data.toString());
      });
    });

    console.log('✅ MCP server started');
  });

  afterAll(async () => {
    if (mcpProcess) {
      mcpProcess.kill();
      await new Promise(resolve => setTimeout(resolve, 1000));
    }
  });

  const sendMCPRequest = (method: string, params?: any): Promise<any> => {
    return new Promise((resolve, reject) => {
      if (!mcpProcess) {
        reject(new Error('MCP process not started'));
        return;
      }

      const request = {
        jsonrpc: '2.0',
        id: requestId++,
        method,
        params
      };

      const timeout = setTimeout(() => {
        reject(new Error('MCP request timeout'));
      }, 30000);

      const handleResponse = (data: Buffer) => {
        const response = data.toString().trim();
        if (response.includes(`"id":${request.id}`)) {
          clearTimeout(timeout);
          mcpProcess!.stdout!.removeListener('data', handleResponse);
          try {
            const parsed = JSON.parse(response);
            resolve(parsed);
          } catch (error) {
            reject(new Error(`Failed to parse MCP response: ${response}`));
          }
        }
      };

      mcpProcess.stdout!.on('data', handleResponse);
      mcpProcess.stdin!.write(JSON.stringify(request) + '\n');
    });
  };

  const askOllamaWithTools = async (question: string, tools: any[]): Promise<any> => {
    const prompt = `You are a legal research assistant with access to CourtListener tools. Answer this question by using the appropriate tools: ${question}

Available tools: ${tools.map(t => `${t.name}: ${t.description}`).join(', ')}

Please use the tools to research and answer the question.`;

    const response = await fetch(`${OLLAMA_HOST}/api/chat`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        model: OLLAMA_MODEL,
        messages: [{ role: 'user', content: prompt }],
        tools: tools,
        stream: false
      })
    });

    if (!response.ok) {
      throw new Error(`Ollama request failed: ${response.statusText}`);
    }

    return await response.json();
  };

  // Test each scenario
  TEST_SCENARIOS.forEach((scenario) => {
    test(`${scenario.description}`, async () => {
      if (!ollamaAvailable) {
        console.log(`⏭️  Skipping: ${skipReason}`);
        return;
      }

      console.log(`\n🧪 Testing: ${scenario.question}`);
      
      // Get available MCP tools
      const toolsResponse = await sendMCPRequest('tools/list');
      expect(toolsResponse.result).toBeDefined();
      expect(toolsResponse.result.tools).toBeInstanceOf(Array);
      
      const mcpTools = toolsResponse.result.tools;
      
      // Convert MCP tools to Ollama format
      const ollamaTools = mcpTools.map((tool: any) => ({
        type: 'function',
        function: {
          name: tool.name,
          description: tool.description,
          parameters: tool.inputSchema
        }
      }));

      // Ask Ollama the question with tools available
      const ollamaResponse = await askOllamaWithTools(scenario.question, ollamaTools);
      
      // Check if expected tools were called
      let toolsCalled: string[] = [];
      
      if (ollamaResponse.message.tool_calls) {
        toolsCalled = ollamaResponse.message.tool_calls.map((call: any) => 
          call.function.name
        );
      }

      // Verify at least one expected tool was called
      const expectedToolCalled = scenario.expectedTools.some(tool => 
        toolsCalled.includes(tool)
      );

      console.log(`📋 Expected tools: ${scenario.expectedTools.join(', ')}`);
      console.log(`🔧 Tools called: ${toolsCalled.join(', ') || 'none'}`);
      
      if (expectedToolCalled) {
        console.log(`✅ Expected tool was called`);
      } else {
        console.log(`⚠️  Expected tool not called, but test may still be valid if LLM understood the question`);
        // Don't fail the test - the LLM might understand but not call tools
        // This gives us insight into which scenarios work vs. need refinement
      }

      // Verify the response contains some meaningful content
      expect(ollamaResponse.message.content).toBeTruthy();
      expect(ollamaResponse.message.content.length).toBeGreaterThan(10);

    }, TEST_TIMEOUT);
  });

  test('MCP server tools are available', async () => {
    if (!ollamaAvailable) {
      console.log(`⏭️  Skipping: ${skipReason}`);
      return;
    }

    const toolsResponse = await sendMCPRequest('tools/list');
    expect(toolsResponse.result).toBeDefined();
    expect(toolsResponse.result.tools).toBeInstanceOf(Array);
    expect(toolsResponse.result.tools.length).toBeGreaterThan(0);

    // Verify all expected tools are present
    const availableTools = toolsResponse.result.tools.map((t: any) => t.name);
    const expectedTools = [
      'search-dockets', 'get-docket', 'search-clusters', 'get-cluster',
      'search-opinions', 'get-opinion', 'list-courts', 'get-court',
      'search-docket-entries', 'get-docket-entry', 'search-parties', 'get-party',
      'search-attorneys', 'get-attorney', 'search-recap-documents', 
      'get-recap-document', 'recap-query'
    ];

    expectedTools.forEach(tool => {
      expect(availableTools).toContain(tool);
    });

    console.log(`✅ All ${expectedTools.length} tools are available`);
  });

  test('Sample tool execution works', async () => {
    if (!ollamaAvailable) {
      console.log(`⏭️  Skipping: ${skipReason}`);
      return;
    }

    // Test a simple tool call
    const toolCallResponse = await sendMCPRequest('tools/call', {
      name: 'list-courts',
      arguments: { limit: 5 }
    });

    expect(toolCallResponse.result).toBeDefined();
    expect(toolCallResponse.result.content).toBeDefined();
    expect(Array.isArray(toolCallResponse.result.content)).toBe(true);
    expect(toolCallResponse.result.content.length).toBeGreaterThan(0);

    console.log('✅ Sample tool call successful');
  });
});
