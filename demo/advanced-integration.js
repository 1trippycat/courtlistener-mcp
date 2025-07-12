#!/usr/bin/env node

/**
 * Advanced MCP + Ollama Integration Demo
 * 
 * This demonstrates the proper way to integrate Ollama with MCP servers,
 * where Ollama can natively call MCP tools as functions during conversations.
 */

import { spawn } from 'child_process';
import { writeFileSync, readFileSync } from 'fs';
import { join } from 'path';
import 'dotenv/config';

console.log('🚀 Advanced Ollama + MCP Integration Demo\n');

// Get Ollama host from environment or use default
const OLLAMA_HOST = process.env.OLLAMA_HOST || 'http://localhost:11434';
console.log(`🔗 Using Ollama host: ${OLLAMA_HOST}`);

class MCPOllamaIntegration {
  constructor() {
    this.mcpProcess = null;
    this.responses = {};
    this.requestId = 1;
    this.tools = [];
  }

  async init() {
    console.log('1. 🔍 Checking Ollama...');
    await this.checkOllama();
    
    console.log('2. 🚀 Starting MCP Server...');
    await this.startMCPServer();
    
    console.log('3. 🔧 Initializing MCP...');
    await this.initializeMCP();
    
    console.log('4. 📋 Loading MCP Tools...');
    await this.loadMCPTools();
    
    console.log('5. 🤖 Starting Interactive Session...');
    await this.startInteractiveSession();
  }

  async checkOllama() {
    const response = await fetch(`${OLLAMA_HOST}/api/tags`);
    if (!response.ok) {
      throw new Error(`Ollama not responding at ${OLLAMA_HOST}. Check connectivity and ensure Ollama is running.`);
    }
    
    const data = await response.json();
    this.models = data.models;
    this.model = data.models[0]?.name || 'deepseek-r1:8b';
    
    console.log('   ✅ Ollama is running');
    console.log('   📋 Available models:', this.models.map(m => m.name).join(', '));
    console.log(`   🤖 Using model: ${this.model}`);
  }

  async startMCPServer() {
    this.mcpProcess = spawn('node', ['build/index.js'], {
      stdio: ['pipe', 'pipe', 'pipe'],
      cwd: process.cwd()
    });
    
    this.mcpProcess.stderr.on('data', (data) => {
      console.log('   📋 MCP:', data.toString().trim());
    });
    
    this.mcpProcess.stdout.on('data', (data) => {
      try {
        const lines = data.toString().split('\n').filter(line => line.trim());
        for (const line of lines) {
          const response = JSON.parse(line);
          if (response.id) {
            this.responses[response.id] = response;
          }
        }
      } catch (e) {
        // Ignore parse errors
      }
    });
    
    // Wait for startup
    await new Promise(resolve => setTimeout(resolve, 2000));
    console.log('   ✅ MCP Server started');
  }

  async sendMCPRequest(method, params = {}) {
    const request = {
      jsonrpc: '2.0',
      id: this.requestId++,
      method,
      params
    };
    
    this.mcpProcess.stdin.write(JSON.stringify(request) + '\n');
    
    // Wait for response
    for (let i = 0; i < 30; i++) {
      await new Promise(resolve => setTimeout(resolve, 1000));
      if (this.responses[request.id]) {
        return this.responses[request.id];
      }
    }
    
    throw new Error(`MCP request timeout: ${method}`);
  }

  async initializeMCP() {
    const response = await this.sendMCPRequest('initialize', {
      protocolVersion: '2024-11-05',
      capabilities: {},
      clientInfo: { name: 'Advanced-MCP-Demo', version: '1.0.0' }
    });
    
    if (response.error) {
      throw new Error(`MCP init failed: ${response.error.message}`);
    }
    
    console.log('   ✅ MCP initialized successfully');
  }

  async loadMCPTools() {
    const response = await this.sendMCPRequest('tools/list');
    
    if (response.error) {
      throw new Error(`Failed to load tools: ${response.error.message}`);
    }
    
    this.tools = response.result.tools;
    console.log(`   ✅ Loaded ${this.tools.length} MCP tools:`);
    
    for (const tool of this.tools) {
      console.log(`      • ${tool.name}: ${tool.description}`);
    }
  }

  async callMCPTool(toolName, args) {
    console.log(`   📡 Calling MCP tool: ${toolName}`);
    console.log(`   📝 Arguments:`, JSON.stringify(args, null, 2));
    
    const response = await this.sendMCPRequest('tools/call', {
      name: toolName,
      arguments: args
    });
    
    if (response.error) {
      console.log(`   ❌ Tool error: ${response.error.message}`);
      return null;
    }
    
    console.log('   ✅ Tool executed successfully');
    return response.result?.content?.[0]?.text || null;
  }

  async askOllamaWithTools(userMessage, conversationHistory = []) {
    const messages = [
      {
        role: "system",
        content: `You are a legal research assistant with access to the CourtListener database through MCP tools.

Available tools for legal research:
${this.tools.map(t => `- ${t.name}: ${t.description}`).join('\n')}

When users ask about legal information:
1. Use appropriate tools to search for relevant information
2. Explain what you're doing and why
3. Provide helpful context about the results
4. Be thorough but concise in your analysis

Guidelines:
- For court information, use get-court with court codes like 'scotus', 'ca9', 'cand'
- For case searches, use search-clusters or search-opinions with relevant filters
- For specific dockets, use search-dockets or get-docket
- Always explain the legal significance of your findings`
      },
      ...conversationHistory,
      {
        role: "user",
        content: userMessage
      }
    ];

    // Convert MCP tools to Ollama function format
    const ollamaTools = this.tools.map(tool => ({
      type: "function",
      function: {
        name: tool.name.replace(/-/g, '_'),
        description: tool.description,
        parameters: tool.inputSchema
      }
    }));

    console.log('   📤 Sending to Ollama with function calling...');
    
    const response = await fetch(`${OLLAMA_HOST}/api/chat`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        model: this.model,
        messages: messages,
        tools: ollamaTools,
        stream: false,
        options: { 
          temperature: 0.3,
          num_predict: 800
        }
      })
    });

    if (!response.ok) {
      throw new Error(`Ollama error: ${response.status}`);
    }

    const result = await response.json();
    
    if (result.message?.tool_calls && result.message.tool_calls.length > 0) {
      console.log('\n   🔧 Ollama is calling MCP tools:');
      
      const toolResults = [];
      
      for (const toolCall of result.message.tool_calls) {
        const toolName = toolCall.function.name.replace(/_/g, '-');
        const args = typeof toolCall.function.arguments === 'string' 
          ? JSON.parse(toolCall.function.arguments)
          : toolCall.function.arguments;
        
        console.log(`\n   🛠️  Tool: ${toolName}`);
        const toolResult = await this.callMCPTool(toolName, args);
        
        if (toolResult) {
          toolResults.push({
            role: "tool",
            tool_call_id: toolCall.id,
            content: toolResult
          });
          
          console.log(`   📊 Result preview: ${toolResult.substring(0, 150)}...`);
        }
      }
      
      if (toolResults.length > 0) {
        // Send tool results back to Ollama for final analysis
        const finalMessages = [
          ...messages,
          result.message,
          ...toolResults
        ];
        
        console.log('\n   🤖 Ollama analyzing results...');
        
        const finalResponse = await fetch(`${OLLAMA_HOST}/api/chat`, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            model: this.model,
            messages: finalMessages,
            stream: false,
            options: { temperature: 0.3, num_predict: 600 }
          })
        });
        
        if (finalResponse.ok) {
          const final = await finalResponse.json();
          return {
            success: true,
            response: final.message.content,
            toolsUsed: result.message.tool_calls.map(tc => tc.function.name),
            conversationHistory: finalMessages
          };
        }
      }
    }
    
    return {
      success: true,
      response: result.message?.content || 'No response',
      toolsUsed: [],
      conversationHistory: messages
    };
  }

  async startInteractiveSession() {
    console.log('\n🎯 Interactive Legal Research Session Started!');
    console.log('💡 Try asking questions like:');
    console.log('   • "Tell me about the Supreme Court"');
    console.log('   • "Find recent Supreme Court cases about free speech"');
    console.log('   • "What courts are in the 9th Circuit?"');
    console.log('   • "Search for cases involving copyright law"');
    console.log('\n' + '='.repeat(60));
    
    // Demo with pre-defined questions
    const demoQuestions = [
      "Tell me about the Supreme Court and find information about their recent jurisdiction",
      "Search for recent Supreme Court cases and explain their significance",
      "What information can you find about the 9th Circuit Court of Appeals?"
    ];
    
    for (let i = 0; i < demoQuestions.length; i++) {
      const question = demoQuestions[i];
      console.log(`\n🙋 Demo Question ${i + 1}: ${question}`);
      console.log('-'.repeat(60));
      
      try {
        const result = await this.askOllamaWithTools(question);
        
        if (result.success) {
          console.log('\n📝 Ollama Response:');
          console.log(result.response);
          
          if (result.toolsUsed.length > 0) {
            console.log(`\n🛠️  Tools Used: ${result.toolsUsed.join(', ')}`);
          }
        }
        
        console.log('\n' + '='.repeat(60));
        
        // Wait between questions
        if (i < demoQuestions.length - 1) {
          console.log('⏳ Waiting before next question...\n');
          await new Promise(resolve => setTimeout(resolve, 3000));
        }
        
      } catch (error) {
        console.error(`❌ Error with question ${i + 1}:`, error.message);
      }
    }
    
    console.log('\n🎉 Demo Complete!');
    console.log('\n✨ Full MCP + Ollama Integration Summary:');
    console.log('   • MCP Server providing legal research tools ✅');
    console.log('   • Ollama using MCP tools as functions ✅');
    console.log('   • Dynamic tool selection based on questions ✅');
    console.log('   • Real-time legal data retrieval ✅');
    console.log('   • AI analysis of legal information ✅');
  }

  cleanup() {
    if (this.mcpProcess) {
      this.mcpProcess.kill();
    }
  }
}

// Main execution
async function main() {
  const integration = new MCPOllamaIntegration();
  
  try {
    await integration.init();
  } catch (error) {
    console.error('❌ Integration failed:', error.message);
    
    if (error.message.includes('Ollama not responding')) {
      console.log('\n💡 Setup Instructions:');
      console.log(`   Current Ollama host: ${OLLAMA_HOST}`);
      console.log('   1. Install Ollama: https://ollama.ai/');
      console.log('   2. Start Ollama: ollama serve');
      console.log('   3. Pull a model: ollama pull deepseek-r1:8b');
      console.log('   4. Verify: ollama list');
      console.log('   5. For Docker: set OLLAMA_HOST=http://ollama:11434');
      console.log('   6. Test connectivity: curl ${OLLAMA_HOST}/api/tags');
    }
    
    console.log('\n📚 For more info: https://docs.ollama.ai/');
  } finally {
    integration.cleanup();
  }
}

// Check Node.js compatibility
if (typeof fetch === 'undefined') {
  console.log('❌ This demo requires Node.js 18+ with built-in fetch');
  process.exit(1);
}

main();
