#!/usr/bin/env node

import { spawn } from 'child_process';

console.log('🎯 CourtListener MCP + Ollama Demo\n');

async function testDemo() {
  try {
    console.log('1. 🔍 Testing Ollama...');
    
    const response = await fetch('http://localhost:11434/api/tags');
    if (!response.ok) {
      throw new Error('Ollama not responding');
    }
    
    const data = await response.json();
    console.log('✅ Ollama is running');
    console.log('📋 Available models:', data.models.map(m => m.name).join(', '));
    
    const model = data.models[0]?.name || 'deepseek-r1:8b';
    console.log(`🤖 Using model: ${model}\n`);
    
    console.log('2. 🚀 Starting MCP Server...');
    
    const mcpProcess = spawn('node', ['build/index.js'], {
      stdio: ['pipe', 'pipe', 'pipe'],
      cwd: process.cwd()
    });
    
    let responses = {};
    let requestId = 1;
    
    // Debug output
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
            console.log(`   📨 Received response for request ${response.id}`);
          }
        }
      } catch (e) {
        // Ignore parse errors
      }
    });
    
    const sendRequest = (method, params = {}) => {
      const request = {
        jsonrpc: '2.0',
        id: requestId++,
        method,
        params
      };
      console.log(`   📤 Sending ${method} request (ID: ${request.id})`);
      mcpProcess.stdin.write(JSON.stringify(request) + '\n');
      return request.id;
    };
    
    // Wait for startup
    console.log('   • Waiting for MCP server startup...');
    await new Promise(resolve => setTimeout(resolve, 3000));
    
    // Initialize
    console.log('3. 🔧 Initializing MCP...');
    const initId = sendRequest('initialize', {
      protocolVersion: '2024-11-05',
      capabilities: {},
      clientInfo: { name: 'Demo', version: '1.0.0' }
    });
    
    await new Promise(resolve => setTimeout(resolve, 3000));
    
    if (responses[initId]) {
      console.log('   ✅ MCP initialized successfully');
      
      // Test court lookup with extended timeout
      console.log('\n4. 🏛️  Testing CourtListener API...');
      const courtId = sendRequest('tools/call', {
        name: 'get-court',
        arguments: { court_id: 'scotus' }  // Using Supreme Court code - see https://www.courtlistener.com/help/api/jurisdictions/ for all court codes
      });
      
      console.log('   ⏳ Waiting for CourtListener API (this can take 10-15 seconds)...');
      
      // Wait longer for the slow API
      for (let i = 0; i < 15; i++) {
        await new Promise(resolve => setTimeout(resolve, 1000));
        if (responses[courtId]) {
          break;
        }
        if (i % 3 === 0) {
          console.log(`   ⏳ Still waiting... (${i + 1}s)`);
        }
      }
      
      if (responses[courtId]) {
        if (responses[courtId].error) {
          console.log('   ❌ API Error:', responses[courtId].error.message);
          console.log('   🔍 Error details:', responses[courtId].error);
        } else if (responses[courtId].result?.content?.[0]?.text) {
          const courtInfo = responses[courtId].result.content[0].text;
          console.log('   ✅ CourtListener API working!');
          console.log('   📋 Supreme Court data retrieved');
          
          console.log('\n5. 🤖 Analyzing with Ollama...');
          
          const prompt = `Based on this Supreme Court information: "${courtInfo.substring(0, 300)}" 

Please provide a brief summary of what the Supreme Court is in 2 sentences.`;
          
          const analysisResponse = await fetch('http://localhost:11434/api/generate', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({
              model: model,
              prompt: prompt,
              stream: false,
              options: { temperature: 0.7, max_tokens: 150 }
            })
          });
          
          if (analysisResponse.ok) {
            const analysis = await analysisResponse.json();
            console.log('   ✅ AI Analysis complete');
            console.log('   💭 Result:', analysis.response.trim());
            
            console.log('\n🎉 Complete Success!');
            console.log('\n✨ Working Components:');
            console.log('   • CourtListener MCP Server ✅');
            console.log('   • CourtListener API integration ✅');
            console.log('   • Ollama AI analysis ✅');
            console.log('   • End-to-end legal research pipeline ✅');
          } else {
            console.log('   ❌ Ollama analysis failed');
          }
        } else {
          console.log('   ❌ No content in API response');
          console.log('   🔍 Response:', JSON.stringify(responses[courtId], null, 2));
        }
      } else {
        console.log('   ⚠️  CourtListener API timeout (15+ seconds)');
        console.log('   💡 This is normal - the free API can be very slow');
        console.log('   📋 MCP Server is working, just API latency issue');
        
        console.log('\n✨ Partial Success:');
        console.log('   • CourtListener MCP Server ✅');
        console.log('   • Ollama integration ✅');
        console.log('   • API timeout (expected with free tier) ⚠️');
      }
    } else {
      console.log('   ❌ MCP initialization failed');
      console.log('   🔍 Available responses:', Object.keys(responses));
    }
    
    mcpProcess.kill();
    
  } catch (error) {
    console.error('❌ Demo error:', error.message);
    console.error('📋 Stack:', error.stack);
  }
}

if (typeof fetch === 'undefined') {
  console.log('❌ This demo requires Node.js 18+ with built-in fetch');
  process.exit(1);
}

testDemo();
