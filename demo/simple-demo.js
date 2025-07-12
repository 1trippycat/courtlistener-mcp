#!/usr/bin/env node

import { spawn } from 'child_process';

console.log('🎯 Simple MCP + Ollama Demo\n');

async function runOllamaDemo() {
  console.log('1. 🔍 Testing Ollama...');
  
  try {
    const response = await fetch('http://localhost:11434/api/tags');
    if (!response.ok) {
      throw new Error('Ollama not responding');
    }
    
    const data = await response.json();
    console.log('✅ Ollama is running');
    console.log('📋 Available models:', data.models.map(m => m.name).join(', '));
    
    // Use the first available model
    const model = data.models[0]?.name || 'deepseek-r1:8b';
    console.log(`🤖 Using model: ${model}\n`);
    
    console.log('2. 🚀 Testing MCP Server...');
    
    // Start MCP server
    const mcpProcess = spawn('node', ['build/index.js'], {
      stdio: ['pipe', 'pipe', 'pipe'],
      cwd: process.cwd()
    });
    
    let responses = {};
    let requestId = 1;
    
    // Handle MCP responses
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
    
    mcpProcess.stderr.on('data', (data) => {
      console.error('MCP Error:', data.toString());
    });
    
    // Send MCP request
    const sendRequest = (method, params = {}) => {
      const request = {
        jsonrpc: '2.0',
        id: requestId++,
        method,
        params
      };
      mcpProcess.stdin.write(JSON.stringify(request) + '\n');
      return request.id;
    };
    
    // Wait for server startup
    await new Promise(resolve => setTimeout(resolve, 2000));
    
    // Initialize
    console.log('   • Initializing MCP server...');
    const initId = sendRequest('initialize', {
      protocolVersion: '2024-11-05',
      capabilities: {},
      clientInfo: { name: 'Ollama Demo', version: '1.0.0' }
    });
    
    // Wait for init response
    await new Promise(resolve => setTimeout(resolve, 2000));
    
    if (responses[initId]) {
      console.log('   ✅ MCP server initialized');
      
      // Test tools list
      console.log('   • Getting available tools...');
      const toolsId = sendRequest('tools/list');
      
      await new Promise(resolve => setTimeout(resolve, 2000));
      
      if (responses[toolsId] && responses[toolsId].result?.tools) {
        const tools = responses[toolsId].result.tools;
        console.log(`   ✅ Found ${tools.length} MCP tools`);
        console.log('   📋 Key tools:', tools.slice(0, 3).map(t => t.name).join(', '));
        
        // Test a simple tool call
        console.log('\n3. 🏛️  Testing court lookup...');
        const courtId = sendRequest('tools/call', {
          name: 'get-court',
          arguments: { id: 'scotus' }
        });
        
        console.log('   • Waiting for API response (CourtListener can be slow)...');
        await new Promise(resolve => setTimeout(resolve, 10000)); // Much longer timeout
        
        if (responses[courtId]) {
          if (responses[courtId].error) {
            console.log('   ❌ Court lookup error:', responses[courtId].error.message);
            console.log('   📋 Error details:', JSON.stringify(responses[courtId].error, null, 2));
          } else if (responses[courtId].result?.content?.[0]?.text) {
          const courtInfo = responses[courtId].result.content[0].text;
          console.log('   ✅ Retrieved Supreme Court info');
          console.log('   📋 Sample:', courtInfo.substring(0, 150) + '...');
          
          // Now use Ollama to analyze
          console.log('\n4. 🤖 Using Ollama to analyze...');
          
          const analysisResponse = await fetch('http://localhost:11434/api/generate', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({
              model: model,
              prompt: `Based on this court information: "${courtInfo.substring(0, 500)}" 
              
Provide a brief 2-sentence summary of what this court is.`,
              stream: false,
              options: { temperature: 0.7, max_tokens: 100 }
            })
          });
          
          if (analysisResponse.ok) {
            const analysis = await analysisResponse.json();
            console.log('   ✅ Ollama analysis complete');
            console.log('   💭 Analysis:', analysis.response.trim());
            
            console.log('\n🎉 Demo Success!');
            console.log('\n💡 This demonstrates:');
            console.log('   • MCP server is working correctly');
            console.log('   • CourtListener API integration');
            console.log('   • Ollama AI analysis capabilities');
            console.log('   • Real-time legal data + AI insights');
          } else {
            console.log('   ❌ Ollama analysis failed');
          }
        } else {
          console.log('   ⚠️  Court lookup timed out or no response');
          console.log('   📋 Available response keys:', Object.keys(responses));
        }
      } else {
        console.log('   ⚠️  Tools list request timed out');
      }
    } else {
      console.log('   ❌ MCP initialization failed');
    }
    
    mcpProcess.kill();
    
  } catch (error) {
    console.error('❌ Demo error:', error.message);
  }
}

// Auto-detect if we have Node.js 18+ with built-in fetch
if (typeof fetch === 'undefined') {
  console.log('❌ This demo requires Node.js 18+ with built-in fetch');
  process.exit(1);
}

runOllamaDemo();
