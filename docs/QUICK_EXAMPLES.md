# Quick Demo Examples

## Starting the Demo

### Option 1: Automatic Setup
```bash
npm run demo:check    # Check your environment
npm run demo:local    # Run locally with Ollama
```

### Option 2: Manual Setup
```bash
# 1. Start Ollama
ollama serve
ollama pull llama3.1:8b

# 2. Run demo
npm run demo:interactive
```

### Option 3: Docker Environment
```bash
# For containerized setup in your environment
npm run demo:compose
```

## Example Conversations

### Basic Court Search
```
You: "What courts are available in California?"

AI: I'll help you find courts in California. Let me search for courts in that state.

[AI calls get-court-codes tool to find California court codes]

Based on the search, here are the courts available in California:

**Federal Courts:**
- Court of Appeals for the Ninth Circuit (ca9)
- Northern District of California (cand)
- Central District of California (cacd)
- Eastern District of California (caed)
- Southern District of California (casd)

**State Courts:**
- California Supreme Court (cal)
- California Court of Appeal districts...
```

### Supreme Court Case Search
```
You: "Find a recent Supreme Court case about privacy"

AI: I'll search for recent Supreme Court cases about privacy. Let me start by getting the correct court code for the Supreme Court, then search for relevant cases.

[AI calls get-court-codes with query "Supreme Court"]
[AI calls search-clusters with court="scotus" and query="privacy"]

Here are recent Supreme Court cases related to privacy:

1. **Case Name v. Respondent** (2023)
   - Docket: 22-123
   - Key Issue: Digital privacy rights
   - Status: Decided
   [Full case details...]
```

### Advanced Search Example
```
You: "Show me employment discrimination cases from the 9th Circuit in 2023"

AI: I'll search for employment discrimination cases from the Court of Appeals for the Ninth Circuit in 2023.

[AI calls search-clusters with:]
- court: "ca9" 
- date_filed_after: "2023-01-01"
- date_filed_before: "2023-12-31"
- query: "employment discrimination"

Found 15 employment discrimination cases from the 9th Circuit in 2023:

1. **Smith v. Tech Corp** (9th Cir. 2023)
   - Filed: March 15, 2023
   - Issue: Age discrimination in hiring
   - Outcome: Reversed district court
   
2. **Johnson v. Manufacturing Inc** (9th Cir. 2023)
   - Filed: July 8, 2023
   - Issue: Sexual harassment policies
   - Outcome: Affirmed in part, remanded
```

## Available Commands in Demo

During the interactive demo, you can:

- **Ask natural questions** about legal topics
- **Search by court name** (AI will find correct codes)
- **Request specific date ranges** 
- **Ask for case summaries**
- **Get court information**
- **Search by legal topic or keyword**

## Troubleshooting Demo Issues

### Ollama Not Found
```
❌ Ollama setup failed: Ollama not responding at http://localhost:11434

💡 Troubleshooting:
   💻 Local Environment:
   • Check Ollama is running: ollama serve
   • Test connection: curl http://localhost:11434/api/tags
   • Install Ollama: https://ollama.ai/
```

### Model Doesn't Support Function Calling
```
⚠️ Warning: This model may not support function calling
💡 For best results, try: llama3.1:8b, qwen2.5, or other function-calling models

Model responded without function calling capability.
Try: ollama pull llama3.1:8b
```

### API Token Issues
```
❌ API Token: Missing
Run: npm run demo:setup
Edit .env file and add COURTLISTENER_API_TOKEN
```

## Container Environment

If running in your containerized environment, the demo will automatically detect this and provide container-specific troubleshooting:

```
🐳 Running in Docker container
✅ Containerized setup detected

🔧 Current Configuration:
   • Ollama host: http://ai_ollama:11434
   • Environment: Container
   • API Token: ✅ Set
```

This ensures the demo works seamlessly in your Docker Swarm environment while remaining flexible for other users' local setups.
