#!/usr/bin/env node

import { spawn } from 'child_process';
import { createInterface } from 'readline';
import 'dotenv/config';

console.log('🎯 Interactive CourtListener MCP + Ollama Chat Demo\n');

// Get Ollama host from environment or use default
const OLLAMA_HOST = process.env.OLLAMA_HOST || 'http://localhost:11434';
console.log(`🔗 Using Ollama host: ${OLLAMA_HOST}\n`);

// Global variables for MCP communication
let mcpProcess;
let responses = {};
let requestId = 1;
let tools = [];
let mcpTools = [];
let selectedModel = '';

const sendMCPRequest = (method, params = {}) => {
  const request = {
    jsonrpc: '2.0',
    id: requestId++,
    method,
    params
  };
  mcpProcess.stdin.write(JSON.stringify(request) + '\n');
  return request.id;
};

async function initializeMCP() {
  console.log('🚀 Starting MCP Server...');
  
  mcpProcess = spawn('node', ['build/index.js'], {
    stdio: ['pipe', 'pipe', 'pipe'],
    cwd: process.cwd()
  });
  
  // Handle MCP server responses
  mcpProcess.stderr.on('data', (data) => {
    // Only show important MCP messages
    const message = data.toString().trim();
    if (message.includes('Server running')) {
      console.log('✅ MCP Server started');
    }
  });
  
  mcpProcess.stdout.on('data', (data) => {
    try {
      const lines = data.toString().split('\n').filter(line => line.trim());
      for (const line of lines) {
        const response = JSON.parse(line);
        if (response.id) {
          responses[response.id] = response;
        }
      }
    } catch (e) {
      // Ignore parse errors
    }
  });
  
  // Wait for MCP startup
  await new Promise(resolve => setTimeout(resolve, 2000));
  
  // Initialize MCP
  console.log('🔧 Initializing MCP connection...');
  const initId = sendMCPRequest('initialize', {
    protocolVersion: '2024-11-05',
    capabilities: {},
    clientInfo: { name: 'Interactive-MCP-Demo', version: '1.0.0' }
  });
  
  await new Promise(resolve => setTimeout(resolve, 2000));
  
  if (!responses[initId]) {
    throw new Error('MCP initialization failed');
  }
  
  // Get available tools
  const toolsId = sendMCPRequest('tools/list');
  await new Promise(resolve => setTimeout(resolve, 1000));
  
  if (!responses[toolsId]) {
    throw new Error('Failed to get MCP tools');
  }
  
  tools = responses[toolsId].result.tools;
  console.log(`✅ MCP initialized with ${tools.length} tools available`);
  
  // Create function definitions for Ollama
  mcpTools = tools.map(tool => ({
    type: "function",
    function: {
      name: tool.name.replace(/-/g, '_'),
      description: tool.description,
      parameters: tool.inputSchema
    }
  }));
  
  return true;
}

async function setupOllama() {
  console.log('🔍 Checking Ollama connection...');
  
  try {
    const response = await fetch(`${OLLAMA_HOST}/api/tags`);
    if (!response.ok) {
      throw new Error(`Ollama not responding at ${OLLAMA_HOST}`);
    }
    
    const data = await response.json();
    console.log('✅ Ollama connected');
    
    if (data.models.length === 0) {
      throw new Error('No models available in Ollama');
    }
    
    // Prioritize function-calling capable models
    const functionModels = data.models.filter(m => 
      m.name.includes('llama3.1') || 
      m.name.includes('qwen') || 
      m.name.includes('mistral')
    );
    
    selectedModel = functionModels[0]?.name || data.models[0]?.name;
    console.log(`🤖 Selected model: ${selectedModel}`);
    
    if (!functionModels.length) {
      console.log('⚠️  Warning: This model may not support function calling');
      console.log('   💡 For best results, try: ollama pull llama3.1:8b');
    }
    
    console.log('📋 Available models:', data.models.map(m => m.name).join(', '));
    
    return true;
  } catch (error) {
    console.error('❌ Ollama setup failed:', error.message);
    console.log('\n💡 Troubleshooting:');
    console.log(`   • Check Ollama is running: curl ${OLLAMA_HOST}/api/tags`);
    console.log('   • For local Ollama: ollama serve');
    console.log('   • For Docker: check OLLAMA_HOST environment variable');
    return false;
  }
}

async function executeMCPTool(toolCall) {
  const mcpToolName = toolCall.function.name.replace(/_/g, '-');
  const args = typeof toolCall.function.arguments === 'string' 
    ? JSON.parse(toolCall.function.arguments)
    : toolCall.function.arguments;
  
  console.log(`   🔧 Executing: ${mcpToolName}`);
  
  const toolCallId = sendMCPRequest('tools/call', {
    name: mcpToolName,
    arguments: args
  });
  
  // Wait for tool response
  for (let i = 0; i < 15; i++) {
    await new Promise(resolve => setTimeout(resolve, 1000));
    if (responses[toolCallId]) break;
    if (i === 5) console.log('      ⏳ Still processing...');
  }
  
  if (responses[toolCallId]) {
    if (responses[toolCallId].error) {
      return `Error: ${responses[toolCallId].error.message}`;
    } else {
      return responses[toolCallId].result?.content?.[0]?.text || 'No result';
    }
  } else {
    return 'Tool call timeout';
  }
}

async function chatWithOllama(userMessage, conversation) {
  try {
    const systemMessage = {
      role: "system",
      content: `You are a legal research assistant with access to the CourtListener database through MCP tools.

Available tools:
${tools.map(t => `- ${t.name}: ${t.description}`).join('\\n')}

IMPORTANT GUIDELINES:
1. When searching for courts, ALWAYS use get-court-codes FIRST to find correct abbreviations
2. For Supreme Court, use court code "scotus"
3. For Circuit Courts, use "ca1", "ca2", "ca9", etc.
4. Always explain what you're doing before calling tools
5. Provide helpful context about legal information
6. If searches return no results, suggest alternative search terms

Be helpful, accurate, and educational about legal topics.`
    };

    const messages = [systemMessage, ...conversation, { role: "user", content: userMessage }];

    console.log('\\n🤖 AI is thinking...');
    
    const response = await fetch(`${OLLAMA_HOST}/api/chat`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        model: selectedModel,
        messages: messages,
        tools: mcpTools,
        stream: false,
        options: { 
          temperature: 0.3,
          num_predict: 1000
        }
      })
    });
    
    if (!response.ok) {
      throw new Error(`Ollama API error: ${response.status}`);
    }
    
    const result = await response.json();
    let finalResponse = result.message.content;
    
    // Handle tool calls
    if (result.message.tool_calls && result.message.tool_calls.length > 0) {
      console.log(`🔧 AI is using ${result.message.tool_calls.length} tool(s)...`);
      
      const toolResults = [];
      
      for (const toolCall of result.message.tool_calls) {
        const toolResult = await executeMCPTool(toolCall);
        toolResults.push({
          role: "tool",
          tool_call_id: toolCall.id || 'tool_call',
          content: toolResult
        });
      }
      
      // Get final response with tool results
      const finalMessages = [
        systemMessage,
        ...conversation,
        { role: "user", content: userMessage },
        result.message,
        ...toolResults
      ];
      
      console.log('🧠 AI is analyzing results...');
      
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
        const finalResult = await finalCall.json();
        finalResponse = finalResult.message.content;
      }
    }
    
    return {
      content: finalResponse,
      used_tools: result.message.tool_calls?.length || 0
    };
    
  } catch (error) {
    return {
      content: `❌ Error: ${error.message}`,
      used_tools: 0
    };
  }
}

async function startInteractiveChat() {
  console.log('\\n🎉 Chat is ready! Type your legal questions below.');
  console.log('💡 Try asking about: Supreme Court cases, circuit court decisions, or specific legal topics');
  console.log('🛑 Type "exit" to quit\\n');
  
  const rl = createInterface({
    input: process.stdin,
    output: process.stdout
  });
  
  const conversation = [];
  
  const askQuestion = () => {
    rl.question('👤 You: ', async (input) => {
      if (input.toLowerCase().trim() === 'exit') {
        console.log('\\n👋 Goodbye!');
        rl.close();
        mcpProcess.kill();
        process.exit(0);
      }
      
      if (!input.trim()) {
        askQuestion();
        return;
      }
      
      const response = await chatWithOllama(input, conversation);
      
      console.log(`\\n🤖 Assistant${response.used_tools > 0 ? ` (used ${response.used_tools} tools)` : ''}:`);
      console.log(response.content);
      console.log('\\n' + '─'.repeat(60));
      
      // Add to conversation history
      conversation.push({ role: "user", content: input });
      conversation.push({ role: "assistant", content: response.content });
      
      // Keep conversation manageable
      if (conversation.length > 10) {
        conversation.splice(0, 2);
      }
      
      askQuestion();
    });
  };
  
  askQuestion();
}

async function main() {
  try {
    // Setup phase
    const ollamaReady = await setupOllama();
    if (!ollamaReady) {
      process.exit(1);
    }
    
    const mcpReady = await initializeMCP();
    if (!mcpReady) {
      console.error('❌ Failed to initialize MCP');
      process.exit(1);
    }
    
    // Start interactive chat
    await startInteractiveChat();
    
  } catch (error) {
    console.error('❌ Demo failed:', error.message);
    console.log('\\n💡 Make sure both Ollama and the MCP server are properly configured');
    process.exit(1);
  }
}

// Handle cleanup
process.on('SIGINT', () => {
  console.log('\\n👋 Shutting down...');
  if (mcpProcess) mcpProcess.kill();
  process.exit(0);
});

// Check Node.js version
if (typeof fetch === 'undefined') {
  console.log('❌ This demo requires Node.js 18+ with built-in fetch');
  process.exit(1);
}

main();
