#!/usr/bin/env node

import { spawn } from 'child_process';

console.log('🚀 Quick Ollama + MCP Demo\n');

// Test Ollama
console.log('1. Testing Ollama connection...');
try {
  const response = await fetch('http://localhost:11434/api/tags');
  if (response.ok) {
    const data = await response.json();
    console.log('✅ Ollama is running');
    console.log('📋 Available models:', data.models.map(m => m.name).join(', '));
  }
} catch (error) {
  console.log('❌ Ollama not available:', error.message);
  process.exit(1);
}

// Test MCP Server
console.log('\n2. Testing MCP Server...');
const mcpProcess = spawn('node', ['build/index.js'], {
  stdio: ['pipe', 'pipe', 'pipe'],
  cwd: process.cwd()
});

let requestId = 1;

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

// Wait for responses
const responses = {};
mcpProcess.stdout.on('data', (data) => {
  try {
    const response = JSON.parse(data.toString().trim());
    if (response.id) {
      responses[response.id] = response;
    }
  } catch (e) {
    console.log('MCP Output:', data.toString());
  }
});

mcpProcess.stderr.on('data', (data) => {
  console.error('MCP Error:', data.toString());
});

// Initialize MCP
const initId = sendMCPRequest('initialize', {
  protocolVersion: '2024-11-05',
  capabilities: {},
  clientInfo: { name: 'Quick Demo', version: '1.0.0' }
});

// Wait for initialization
setTimeout(async () => {
  if (responses[initId]) {
    console.log('✅ MCP Server initialized');
    
    // Test a simple tool call
    console.log('\n3. Testing MCP tool call...');
    const toolId = sendMCPRequest('tools/call', {
      name: 'get-court',
      arguments: { id: 'scotus' }
    });
    
    setTimeout(() => {
      if (responses[toolId]) {
        console.log('✅ MCP tool call successful');
        console.log('📋 Response:', responses[toolId].result?.content?.[0]?.text?.substring(0, 200) + '...');
        
        console.log('\n🎉 Demo Complete!');
        console.log('\n💡 Your setup is ready for:');
        console.log('   • Interactive demos: npm run demo:interactive');
        console.log('   • Full Ollama integration');
        console.log('   • Claude Desktop integration');
        console.log('   • Custom MCP client development');
        
      } else {
        console.log('⏱️  MCP tool call pending...');
      }
      
      mcpProcess.kill();
    }, 3000);
    
  } else {
    console.log('⏱️  MCP initialization pending...');
    mcpProcess.kill();
  }
}, 2000);
