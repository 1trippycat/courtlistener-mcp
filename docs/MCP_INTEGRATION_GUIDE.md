# MCP + Ollama Integration Guide

This guide explains the different ways to integrate the CourtListener MCP server with Ollama for AI-powered legal research.

## 🎯 Integration Approaches

### 1. Basic API → AI Analysis (`fixed-demo.js`)
**What it does**: Manual API calls with AI analysis
- You call MCP tools directly
- Pass results to Ollama for analysis
- Simple but limited approach

```
User Question → MCP Tool → Raw Data → Ollama Analysis → Response
```

### 2. Function Calling Integration (`ollama-mcp-integration.js`)
**What it does**: Ollama can call MCP tools as functions
- Ollama sees MCP tools as available functions
- Ollama decides which tools to use based on user questions
- True AI-powered tool selection

```
User Question → Ollama → Function Calls → MCP Tools → Results → AI Analysis → Response
```

### 3. Advanced Integration (`advanced-integration.js`)
**What it does**: Full conversational interface with MCP
- Multi-turn conversations with tool usage
- Context preservation across tool calls
- Production-ready integration pattern

```
User Question → Ollama + Context → Smart Tool Selection → MCP Execution → Integrated Response
```

## 🚀 How Function Calling Works

The key difference is in how Ollama interacts with the MCP server:

### Traditional Approach (What you were doing)
```javascript
// 1. You manually call MCP
const courtData = await mcpCall('get-court', { court_id: 'scotus' });

// 2. You manually send to Ollama
const analysis = await ollama.generate({
  prompt: `Analyze this court data: ${courtData}`
});
```

### Function Calling Approach (Proper MCP Integration)
```javascript
// 1. You send tools to Ollama
const tools = await mcpServer.getTools();

// 2. Ollama decides what tools to use
const response = await ollama.chat({
  messages: [{ role: 'user', content: 'Tell me about the Supreme Court' }],
  tools: tools  // Ollama can now call MCP tools automatically
});

// 3. Ollama calls tools as needed
// 4. Ollama analyzes results automatically
```

## 🛠️ Setting Up Function Calling

### Prerequisites

1. **Ollama with Function Calling Support**
   ```bash
   # Install Ollama
   curl -fsSL https://ollama.ai/install.sh | sh
   
   # Start Ollama
   ollama serve
   
   # Pull a function-calling model
   ollama pull llama3.1:8b
   # or
   ollama pull qwen2.5:7b
   # or 
   ollama pull deepseek-r1:8b
   ```

2. **CourtListener MCP Server**
   ```bash
   npm run build
   ```

### Running the Demos

#### Basic Integration Test
```bash
node demo/fixed-demo.js
```
- Tests basic MCP connectivity
- Shows manual tool calling
- Good for debugging

#### Function Calling Integration
```bash
node demo/ollama-mcp-integration.js
```
- Tests Ollama function calling
- Shows tool auto-selection
- Demonstrates true MCP integration

#### Advanced Integration
```bash
node demo/advanced-integration.js
```
- Full conversational interface
- Multiple demo questions
- Production-ready pattern

## 🔍 Understanding the Output

### When Function Calling Works
```
🎉 SUCCESS! Ollama is using MCP tools!
   🔧 Tool calls requested:
   • get_court with args: {"court_id": "scotus"}
   📡 Executing MCP tool: get-court
   ✅ Tool executed successfully!
```

### When Function Calling Doesn't Work
```
⚠️  Ollama did not use function calling
   💭 Regular response: [text response without tool usage]
   📝 Note: This model might not support function calling.
```

## 🤖 Function Calling Compatible Models

### Recommended Models
- **Llama 3.1** (8B, 70B) - Excellent function calling
- **Qwen 2.5** (7B, 14B) - Great for legal analysis
- **DeepSeek R1** (8B) - Good reasoning + function calling
- **Mistral** (7B) - Reliable function calling

### Testing Model Compatibility
```bash
# Test if a model supports function calling
ollama run llama3.1:8b "Can you call functions?"
```

## 🎯 What Makes This Powerful

### Traditional Approach Limitations
- You decide which tools to use
- Manual data flow management
- Limited to simple use cases
- No contextual tool selection

### MCP Function Calling Benefits
- **Smart Tool Selection**: AI chooses relevant tools
- **Dynamic Queries**: Tools selected based on user intent
- **Context Awareness**: Multi-step research workflows
- **Natural Language**: Users ask questions naturally

### Example Conversation Flow
```
User: "Find recent Supreme Court cases about free speech"

Ollama thinks: 
1. First get Supreme Court info (get-court)
2. Then search for recent cases (search-clusters)
3. Filter for free speech topics
4. Analyze and summarize findings

Result: Comprehensive research with multiple tool calls
```

## 🔧 Troubleshooting

### Ollama Not Using Functions
1. **Check Model**: Use a function-calling compatible model
2. **Check Ollama Version**: Update to latest version
3. **Check Tool Format**: Ensure proper OpenAI function format

### MCP Connection Issues
1. **Build Project**: `npm run build`
2. **Check Environment**: Verify API token if needed
3. **Check Startup**: MCP server needs time to initialize

### Slow API Responses
1. **CourtListener API**: Free tier can be slow (10-15 seconds)
2. **Expected Behavior**: Timeouts are normal with free API
3. **Authentication**: API token improves performance

## 📚 Next Steps

### For Development
1. Try the advanced integration demo
2. Modify prompts for specific legal research needs
3. Add conversation memory and context
4. Implement streaming responses

### For Production
1. Add error handling and retries
2. Implement response caching
3. Add user authentication
4. Scale with multiple MCP servers

## 🎉 Success Indicators

You'll know it's working when:
- ✅ Ollama automatically calls MCP tools
- ✅ Tools are selected based on user questions  
- ✅ Multiple tools used in complex queries
- ✅ Natural conversation flow with legal data
- ✅ No manual tool orchestration needed

This is the true power of MCP: AI agents that can intelligently use tools to research legal information!
