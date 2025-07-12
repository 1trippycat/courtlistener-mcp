#!/usr/bin/env node

import { spawn } from 'child_process';
import dotenv from 'dotenv';

dotenv.config();

class OllamaMCPIntegration {
  constructor() {
    this.mcpProcess = null;
    this.requestId = 1;
    this.ollamaModel = 'deepseek-r1:8b'; // Use available model
  }

  async checkOllama() {
    try {
      console.log('🔍 Checking Ollama installation...');
      const response = await fetch('http://localhost:11434/api/tags');
      if (response.ok) {
        const data = await response.json();
        console.log('✅ Ollama is running');
        console.log('📋 Available models:', data.models.map(m => m.name).join(', '));
        return true;
      }
    } catch (error) {
      console.log('❌ Ollama not running. Start it with: ollama serve');
      return false;
    }
  }

  async startMCPServer() {
    console.log('🚀 Starting CourtListener MCP Server...');
    
    this.mcpProcess = spawn('node', ['build/index.js'], {
      stdio: ['pipe', 'pipe', 'pipe'],
      cwd: process.cwd()
    });

    // Initialize the MCP server
    await this.sendMCPRequest('initialize', {
      protocolVersion: '2024-11-05',
      capabilities: {},
      clientInfo: {
        name: 'Ollama Integration Test',
        version: '1.0.0'
      }
    });

    console.log('✅ MCP Server initialized!');
  }

  async sendMCPRequest(method, params = {}) {
    const request = {
      jsonrpc: '2.0',
      id: this.requestId++,
      method,
      params
    };

    return new Promise((resolve, reject) => {
      const timeout = setTimeout(() => {
        reject(new Error('Request timeout'));
      }, 15000);

      const onData = (data) => {
        try {
          const response = JSON.parse(data.toString());
          if (response.id === request.id) {
            clearTimeout(timeout);
            this.mcpProcess.stdout.removeListener('data', onData);
            resolve(response);
          }
        } catch (e) {
          // Ignore parsing errors
        }
      };

      this.mcpProcess.stdout.on('data', onData);
      this.mcpProcess.stdin.write(JSON.stringify(request) + '\n');
    });
  }

  async queryOllama(prompt, context = '') {
    const fullPrompt = context ? `${context}\n\nBased on this legal information, ${prompt}` : prompt;
    
    const response = await fetch('http://localhost:11434/api/generate', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        model: this.ollamaModel,
        prompt: fullPrompt,
        stream: false,
        options: {
          temperature: 0.7,
          max_tokens: 500
        }
      })
    });

    if (!response.ok) {
      throw new Error(`Ollama request failed: ${response.statusText}`);
    }

    const data = await response.json();
    return data.response;
  }

  async demonstrateIntegration() {
    console.log('\n🤖 Demonstrating Ollama + CourtListener MCP Integration\n');

    // 1. Get some legal data from MCP
    console.log('📋 Step 1: Fetching Supreme Court information via MCP...');
    const courtResponse = await this.sendMCPRequest('tools/call', {
      name: 'get-court',
      arguments: { id: 'scotus' }
    });

    let courtInfo = '';
    if (courtResponse.result && courtResponse.result.content) {
      courtInfo = courtResponse.result.content[0].text;
      console.log('✅ Retrieved court information');
    }

    // 2. Search for some recent dockets
    console.log('\n📋 Step 2: Searching for recent Supreme Court dockets...');
    const docketResponse = await this.sendMCPRequest('tools/call', {
      name: 'search-dockets',
      arguments: {
        court: 'scotus',
        ordering: '-date_created',
        page_size: 2
      }
    });

    let docketInfo = '';
    if (docketResponse.result && docketResponse.result.content) {
      docketInfo = docketResponse.result.content[0].text;
      console.log('✅ Retrieved recent dockets');
    }

    // 3. Use Ollama to analyze the legal data
    console.log('\n🤖 Step 3: Using Ollama to analyze the legal data...');
    
    const analysis = await this.queryOllama(
      'summarize the key information about this court and its recent cases in 2-3 sentences.',
      `${courtInfo}\n\nRecent Cases:\n${docketInfo}`
    );

    console.log('\n📝 Ollama Analysis:');
    console.log(analysis);

    // 4. Ask Ollama to suggest a search query
    console.log('\n🔍 Step 4: Asking Ollama to suggest a legal search query...');
    
    const searchSuggestion = await this.queryOllama(
      'suggest a specific legal topic or case type that would be interesting to search for in court records. Give me just the search terms, no explanation.'
    );

    console.log('\n💡 Ollama suggests searching for:', searchSuggestion.trim());

    // 5. Use the suggestion to search opinions
    console.log('\n📖 Step 5: Searching opinions based on Ollama\'s suggestion...');
    
    const opinionResponse = await this.sendMCPRequest('tools/call', {
      name: 'search-opinions',
      arguments: {
        q: searchSuggestion.trim().substring(0, 50), // Limit query length
        page_size: 2
      }
    });

    if (opinionResponse.result && opinionResponse.result.content) {
      const opinionInfo = opinionResponse.result.content[0].text;
      console.log('✅ Found relevant opinions');

      // 6. Final analysis
      console.log('\n🎯 Step 6: Final analysis combining all data...');
      
      const finalAnalysis = await this.queryOllama(
        'provide a brief overview of what we found in our legal research today.',
        `Court Info: ${courtInfo}\n\nRecent Dockets: ${docketInfo}\n\nSearch Results: ${opinionInfo}`
      );

      console.log('\n📊 Final Analysis:');
      console.log(finalAnalysis);
    }

    console.log('\n🎉 Integration demonstration completed!');
    console.log('\n💡 This shows how Ollama can work with the CourtListener MCP to:');
    console.log('   • Retrieve legal data via MCP tools');
    console.log('   • Analyze and summarize court information');
    console.log('   • Generate intelligent search queries');
    console.log('   • Provide insights on legal research results');
  }

  async run() {
    try {
      // Check if Ollama is available
      const ollamaReady = await this.checkOllama();
      if (!ollamaReady) {
        console.log('\n📖 To run this demo:');
        console.log('1. Install Ollama: https://ollama.ai/');
        console.log('2. Start Ollama: ollama serve');
        console.log('3. Pull a model: ollama pull llama3.2');
        console.log('4. Run this demo again');
        return;
      }

      // Start MCP server
      await this.startMCPServer();

      // Run the integration demo
      await this.demonstrateIntegration();

    } catch (error) {
      console.error('❌ Integration error:', error.message);
    } finally {
      if (this.mcpProcess) {
        this.mcpProcess.kill();
      }
    }
  }
}

// Run if called directly
if (import.meta.url === `file://${process.argv[1]}`) {
  const integration = new OllamaMCPIntegration();
  integration.run();
}

export default OllamaMCPIntegration;
