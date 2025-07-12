#!/usr/bin/env node

import { spawn } from 'child_process';
import readline from 'readline';
import dotenv from 'dotenv';

dotenv.config();

class MCPDemo {
  constructor() {
    this.mcpProcess = null;
    this.rl = readline.createInterface({
      input: process.stdin,
      output: process.stdout
    });
    this.requestId = 1;
  }

  async startMCPServer() {
    console.log('🚀 Starting CourtListener MCP Server...\n');
    
    this.mcpProcess = spawn('node', ['build/index.js'], {
      stdio: ['pipe', 'pipe', 'pipe'],
      cwd: process.cwd()
    });

    this.mcpProcess.stdout.on('data', (data) => {
      try {
        const response = JSON.parse(data.toString());
        console.log('📝 MCP Response:', JSON.stringify(response, null, 2));
      } catch (e) {
        console.log('📝 MCP Output:', data.toString());
      }
    });

    this.mcpProcess.stderr.on('data', (data) => {
      console.error('❌ MCP Error:', data.toString());
    });

    // Initialize the MCP server
    await this.sendMCPRequest('initialize', {
      protocolVersion: '2024-11-05',
      capabilities: {},
      clientInfo: {
        name: 'CourtListener Demo',
        version: '1.0.0'
      }
    });

    await this.sleep(1000);
    console.log('✅ MCP Server initialized!\n');
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
      }, 10000);

      const onData = (data) => {
        try {
          const response = JSON.parse(data.toString());
          if (response.id === request.id) {
            clearTimeout(timeout);
            this.mcpProcess.stdout.removeListener('data', onData);
            resolve(response);
          }
        } catch (e) {
          // Ignore parsing errors, might be partial data
        }
      };

      this.mcpProcess.stdout.on('data', onData);
      this.mcpProcess.stdin.write(JSON.stringify(request) + '\n');
    });
  }

  async sleep(ms) {
    return new Promise(resolve => setTimeout(resolve, ms));
  }

  async demoSearchDockets() {
    console.log('\n🏛️  DEMO: Searching for Supreme Court dockets...\n');
    
    const response = await this.sendMCPRequest('tools/call', {
      name: 'search-dockets',
      arguments: {
        court: 'scotus',
        ordering: '-date_created',
        page_size: 3
      }
    });

    if (response.result && response.result.content) {
      console.log('📋 Found Supreme Court dockets:');
      console.log(response.result.content[0].text);
    }
  }

  async demoSearchOpinions() {
    console.log('\n📖 DEMO: Searching for recent opinions about "artificial intelligence"...\n');
    
    const response = await this.sendMCPRequest('tools/call', {
      name: 'search-opinions',
      arguments: {
        q: 'artificial intelligence',
        ordering: '-date_created',
        page_size: 2
      }
    });

    if (response.result && response.result.content) {
      console.log('🤖 Found AI-related opinions:');
      console.log(response.result.content[0].text);
    }
  }

  async demoGetCourt() {
    console.log('\n🏛️  DEMO: Getting information about the Supreme Court...\n');
    
    const response = await this.sendMCPRequest('tools/call', {
      name: 'get-court',
      arguments: {
        id: 'scotus'
      }
    });

    if (response.result && response.result.content) {
      console.log('⚖️  Supreme Court information:');
      console.log(response.result.content[0].text);
    }
  }

  async demoListTools() {
    console.log('\n🔧 DEMO: Available MCP tools...\n');
    
    const response = await this.sendMCPRequest('tools/list');

    if (response.result && response.result.tools) {
      console.log('🛠️  Available tools:');
      response.result.tools.forEach(tool => {
        console.log(`  • ${tool.name}: ${tool.description}`);
      });
    }
  }

  async runInteractiveDemo() {
    try {
      await this.startMCPServer();
      
      console.log('🎭 Welcome to the CourtListener MCP Demo!\n');
      console.log('This demo will show you the capabilities of our MCP server.\n');

      // Run demo scenarios
      await this.demoListTools();
      await this.sleep(2000);

      await this.demoGetCourt();
      await this.sleep(2000);

      await this.demoSearchDockets();
      await this.sleep(2000);

      await this.demoSearchOpinions();
      await this.sleep(2000);

      console.log('\n🎉 Demo completed! The MCP server is ready for integration with AI assistants.');
      console.log('\n💡 Next steps:');
      console.log('   • Integrate with Claude Desktop using the MCP configuration');
      console.log('   • Use with Open WebUI via MCP bridge');
      console.log('   • Build custom applications using the MCP protocol');

    } catch (error) {
      console.error('❌ Demo error:', error.message);
    } finally {
      if (this.mcpProcess) {
        this.mcpProcess.kill();
      }
      this.rl.close();
    }
  }

  async runInteractive() {
    try {
      await this.startMCPServer();
      
      console.log('🎮 Interactive MCP Demo');
      console.log('Type commands or "help" for options, "quit" to exit\n');

      const askQuestion = () => {
        this.rl.question('MCP> ', async (input) => {
          const command = input.trim().toLowerCase();
          
          try {
            switch (command) {
              case 'help':
                console.log('\nAvailable commands:');
                console.log('  help          - Show this help');
                console.log('  tools         - List available tools');
                console.log('  search        - Search for dockets');
                console.log('  opinions      - Search opinions');
                console.log('  court         - Get court info');
                console.log('  demo          - Run full demo');
                console.log('  quit          - Exit\n');
                break;
                
              case 'tools':
                await this.demoListTools();
                break;
                
              case 'search':
                await this.demoSearchDockets();
                break;
                
              case 'opinions':
                await this.demoSearchOpinions();
                break;
                
              case 'court':
                await this.demoGetCourt();
                break;
                
              case 'demo':
                await this.runInteractiveDemo();
                return;
                
              case 'quit':
                console.log('👋 Goodbye!');
                if (this.mcpProcess) {
                  this.mcpProcess.kill();
                }
                this.rl.close();
                return;
                
              default:
                console.log('Unknown command. Type "help" for options.');
            }
          } catch (error) {
            console.error('Error:', error.message);
          }
          
          console.log('');
          askQuestion();
        });
      };

      askQuestion();
      
    } catch (error) {
      console.error('❌ Setup error:', error.message);
      this.rl.close();
    }
  }
}

// Check if script is run directly
if (import.meta.url === `file://${process.argv[1]}`) {
  const demo = new MCPDemo();
  
  const mode = process.argv[2] || 'interactive';
  
  if (mode === 'demo') {
    demo.runInteractiveDemo();
  } else {
    demo.runInteractive();
  }
}

export default MCPDemo;
