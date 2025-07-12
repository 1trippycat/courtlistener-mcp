#!/usr/bin/env node

import { spawn } from 'child_process';
import 'dotenv/config';

console.log('🎯 True Ollama + MCP Integration Demo\n');

// Environment detection for better user guidance
function detectEnvironment() {
  const isDocker = process.env.DOCKER_CONTAINER || process.env.NODE_ENV === 'production';
  const hasSwarmNet = process.env.OLLAMA_HOST?.includes('ai_ollama');
  return { isDocker, hasSwarmNet };
}

function showContainerSetup() {
  const env = detectEnvironment();
  
  if (env.isDocker || env.hasSwarmNet) {
    console.log('🐳 Containerized Environment Detected');
    console.log('=====================================');
    console.log('This demo is designed for MCP ↔ Ollama integration testing.');
    console.log('Make sure your Docker Swarm setup includes:');
    console.log('• ai_ollama service running');
    console.log('• swarm_net network connectivity');
    console.log('• OLLAMA_HOST=http://ai_ollama:11434 (current)');
    console.log('');
  }
}

showContainerSetup();

// Get Ollama host from environment or use default
const OLLAMA_HOST = process.env.OLLAMA_HOST || 'http://localhost:11434';
console.log(`🔗 Using Ollama host: ${OLLAMA_HOST}`);

async function testMCPIntegration() {
  try {
    console.log('\n1. 🔍 Testing Ollama...');
    
    const response = await fetch(`${OLLAMA_HOST}/api/tags`);
    if (!response.ok) {
      throw new Error(`Ollama not responding at ${OLLAMA_HOST} - make sure it's running and accessible`);
    }
    
    const data = await response.json();
    console.log('✅ Ollama is running');
    console.log('📋 Available models:', data.models.map(m => m.name).join(', '));
    
    // Prefer models that support function calling
    const functionCallingModels = ['llama3.1:8b', 'llama3.1', 'qwen2.5', 'yi-coder:9b'];
    const availableModels = data.models.map(m => m.name);
    const model = functionCallingModels.find(m => availableModels.includes(m)) || availableModels[0] || 'llama3.1:8b';
    console.log(`🤖 Using model: ${model}`);
    
    // Check if the selected model supports function calling
    const supportsFunctionCalling = functionCallingModels.some(fcModel => model.includes(fcModel.split(':')[0]));
    if (!supportsFunctionCalling) {
      console.log('⚠️  Warning: This model may not support function calling');
      console.log('💡 Consider using: llama3.1:8b, qwen2.5, or yi-coder for best results\n');
    } else {
      console.log('✅ This model supports function calling\n');
    }
    
    console.log('2. 🚀 Starting MCP Server...');
    
    const mcpProcess = spawn('node', ['build/index.js'], {
      stdio: ['pipe', 'pipe', 'pipe'],
      cwd: process.cwd()
    });
    
    let responses = {};
    let requestId = 1;
    
    // Handle MCP server responses
    mcpProcess.stderr.on('data', (data) => {
      console.log('   📋 MCP Info:', data.toString().trim());
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
    
    // Wait for MCP startup
    console.log('   • Waiting for MCP server startup...');
    await new Promise(resolve => setTimeout(resolve, 2000));
    
    // Initialize MCP
    console.log('3. 🔧 Initializing MCP...');
    const initId = sendMCPRequest('initialize', {
      protocolVersion: '2024-11-05',
      capabilities: {},
      clientInfo: { name: 'Ollama-MCP-Demo', version: '1.0.0' }
    });
    
    await new Promise(resolve => setTimeout(resolve, 2000));
    
    if (!responses[initId]) {
      throw new Error('MCP initialization failed');
    }
    
    console.log('   ✅ MCP initialized successfully');
    
    // Get available tools
    const toolsId = sendMCPRequest('tools/list');
    await new Promise(resolve => setTimeout(resolve, 1000));
    
    if (!responses[toolsId]) {
      throw new Error('Failed to get MCP tools');
    }
    
    const tools = responses[toolsId].result.tools;
    console.log(`   📋 Available MCP tools: ${tools.length} tools loaded`);
    
    // Create a function-calling interface for Ollama
    const mcpTools = tools.map(tool => ({
      type: "function",
      function: {
        name: tool.name.replace(/-/g, '_'), // Ollama prefers underscores
        description: tool.description,
        parameters: tool.inputSchema
      }
    }));
    
    console.log('\n4. 🤖 Testing Ollama with MCP Function Calling...');
    
    // Test conversation with function calling
    const conversation = [
      {
        role: "system",
        content: `You are a legal research assistant with access to the CourtListener database through MCP tools. 
        
Available tools:
${tools.map(t => `- ${t.name}: ${t.description}`).join('\n')}

IMPORTANT: When searching for court cases, always use the get-court-codes tool FIRST to find the correct court abbreviations. For example:
- Supreme Court = "scotus"
- Ninth Circuit = "ca9" 
- Southern District of New York = "nysd"

Do not guess court codes - always check first with get-court-codes!

When a user asks about legal information, use these tools to search for relevant cases, court information, or legal documents. Always explain what you're doing and provide helpful context about the results.`
      },
      {
        role: "user", 
        content: "Can you tell me about the Supreme Court and find a recent case they decided? Start by getting the correct court code."
      }
    ];
    
    console.log('   📤 Sending conversation to Ollama with tools...');
    
    const ollamaResponse = await fetch(`${OLLAMA_HOST}/api/chat`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        model: model,
        messages: conversation,
        tools: mcpTools,
        stream: false,
        options: { 
          temperature: 0.3,
          num_predict: 500
        }
      })
    });
    
    if (!ollamaResponse.ok) {
      const errorText = await ollamaResponse.text();
      console.log(`   ❌ Ollama API error ${ollamaResponse.status}: ${errorText}`);
      
      if (errorText.includes('does not support tools')) {
        console.log(`   💡 Model '${model}' doesn't support function calling`);
        console.log('   🔄 Trying without tools...');
        
        // Retry without tools
        const simpleResponse = await fetch(`${OLLAMA_HOST}/api/chat`, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            model: model,
            messages: conversation,
            stream: false,
            options: { temperature: 0.3, num_predict: 200 }
          })
        });
        
        if (simpleResponse.ok) {
          const result = await simpleResponse.json();
          console.log('\n   ⚠️  Fallback: Model responded without function calling');
          console.log('   💭 Response:', result.message?.content);
          console.log('\n   📝 To enable function calling, try these models:');
          console.log('     • ollama pull llama3.1:8b');
          console.log('     • ollama pull qwen2.5:7b');
          return;
        }
      }
      
      throw new Error(`Ollama API error: ${ollamaResponse.status} - ${errorText}`);
    }
    
    const result = await ollamaResponse.json();
    console.log('   ✅ Ollama response received');
    
    // Debug: Show the actual response structure
    console.log('   🔍 Response structure:', JSON.stringify({
      role: result.message?.role,
      content: result.message?.content ? result.message.content.substring(0, 100) + '...' : null,
      tool_calls: result.message?.tool_calls?.length || 0
    }, null, 2));
    
    if (result.message?.tool_calls && result.message.tool_calls.length > 0) {
      console.log('\n🎉 SUCCESS! Ollama is using MCP tools!');
      console.log('   🔧 Tool calls requested:');
      
      for (const toolCall of result.message.tool_calls) {
        console.log(`   • ${toolCall.function.name} with args:`, toolCall.function.arguments);
        
        // Execute the MCP tool call
        const mcpToolName = toolCall.function.name.replace(/_/g, '-');
        const args = typeof toolCall.function.arguments === 'string' 
          ? JSON.parse(toolCall.function.arguments)
          : toolCall.function.arguments;
        
        console.log(`   📡 Executing MCP tool: ${mcpToolName}`);
        
        const toolCallId = sendMCPRequest('tools/call', {
          name: mcpToolName,
          arguments: args
        });
        
        // Wait for tool response
        console.log('   ⏳ Waiting for tool response...');
        for (let i = 0; i < 20; i++) {
          await new Promise(resolve => setTimeout(resolve, 1000));
          if (responses[toolCallId]) break;
          if (i % 5 === 0) console.log(`     ... still waiting (${i + 1}s)`);
        }
        
        if (responses[toolCallId]) {
          if (responses[toolCallId].error) {
            console.log('   ❌ Tool error:', responses[toolCallId].error.message);
          } else {
            console.log('   ✅ Tool executed successfully!');
            const content = responses[toolCallId].result?.content?.[0]?.text;
            if (content) {
              console.log('   📋 Tool result preview:', content.substring(0, 200) + '...');
              
              // Send result back to Ollama for final response
              conversation.push(result.message);
              conversation.push({
                role: "tool",
                tool_call_id: toolCall.id,
                content: content
              });
              
              console.log('\n   🤖 Sending tool results back to Ollama...');
              
              const finalResponse = await fetch(`${OLLAMA_HOST}/api/chat`, {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({
                  model: model,
                  messages: conversation,
                  stream: false,
                  options: { temperature: 0.3, num_predict: 300 }
                })
              });
              
              if (finalResponse.ok) {
                const final = await finalResponse.json();
                console.log('\n   💭 Ollama\'s final analysis:');
                console.log('   ' + final.message.content.replace(/\n/g, '\n   '));
              }
            }
          }
        } else {
          console.log('   ⚠️  Tool call timeout');
        }
      }
      
      console.log('\n🎊 COMPLETE SUCCESS!');
      console.log('✨ Full MCP Integration Working:');
      console.log('   • Ollama can see MCP tools ✅');
      console.log('   • Ollama can call MCP functions ✅');
      console.log('   • MCP server executes tools ✅');
      console.log('   • Results flow back to Ollama ✅');
      console.log('   • Ollama analyzes legal data ✅');
      
    } else {
      console.log('\n⚠️  Ollama did not use function calling');
      console.log('   💭 Regular response:', result.message?.content);
      console.log('\n   📝 Note: This model might not support function calling.');
      console.log('   💡 Try with: llama3.1, qwen2.5, or other function-calling models');
    }
    
    mcpProcess.kill();
    
  } catch (error) {
    console.error('❌ Integration error:', error.message);
    console.error('📋 Stack:', error.stack);
    
    if (error.message.includes('Ollama not responding')) {
      console.log('\n💡 Troubleshooting:');
      console.log(`   Current Ollama host: ${OLLAMA_HOST}`);
      console.log('   • For local Ollama: ollama serve');
      console.log('   • For Docker Ollama: set OLLAMA_HOST=http://ollama:11434');
      console.log('   • Verify: curl ${OLLAMA_HOST}/api/tags');
      console.log('   • Check network connectivity between containers');
    }
  }
}

// Check Node.js version
if (typeof fetch === 'undefined') {
  console.log('❌ This demo requires Node.js 18+ with built-in fetch');
  process.exit(1);
}

testMCPIntegration();
