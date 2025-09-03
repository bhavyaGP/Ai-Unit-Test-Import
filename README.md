# AI Test Generator Example

This example contains a minimal Node.js implementation of the components we discussed:
- change-detector.js
- analyzer.js
- test-generator-agent.js (includes `callLLM` implemented using LangGraph SDK or HTTP fallback)
- test-saver.js
- runner.js
- mutation-agent.js
- git-ops.js (includes PR creation via Octokit)
- orchestrator/index.js
- cli.js (simple CLI to run orchestrator)
- sample source file: src/math.js

## Quickstart (local)

1. Clone or copy this example repo.
2. Install deps:
   ```
   npm ci
   ```
3. Set environment variables:
   ```
   export LANGGRAPH_API_KEY=your_key_here
   export LLM_MODEL=codellama:7b-instruct-q4_K_M
   export GITHUB_TOKEN=ghp_xxx
   export GIT_AUTHOR_NAME="ai-bot"
   export GIT_AUTHOR_EMAIL="aibot@example.com"
   export COVERAGE_THRESHOLD=80
   ```
4. Bootstrap (generate tests for all files):
   ```
   node cli.js --bootstrap
   ```
5. To run incremental between commits locally:
   ```
   node cli.js --prev <prev-commit> --curr <curr-commit>
   ```

## Notes
- The LangGraph SDK usage shown is a minimal example; you may need to adapt to your installed SDK version.
- The code uses markers `/* TEST_FOR: <name> */` to avoid duplicate appends.
- The example will produce a zip in `/mnt/data` when created here. You can unzip and inspect the files.

## LangGraph-local workflow (built-in)
This repo includes a minimal local LangGraph-style workflow in `langgraph_workflow_local.js`.
It implements two agents:
- TestGeneratorAgent -> generates tests via Ollama (codellama:7b-instruct-q4_K_M)
- MutationAgent -> generates additional tests when coverage is below threshold

The orchestrator uses `runForFile` from that workflow for generation and `MutationAgent` for mutation loops.
No API keys are required. Ensure Ollama is running locally and the model is available:
```bash
ollama pull codellama:7b-instruct-q4_K_M
# then start ollama (if not already): ollama serve
```

Run the bootstrap (generate tests for all source files):
```bash
node cli.js --bootstrap
```

Run an incremental diff job (between commits):
```bash
node cli.js --prev HEAD~1 --curr HEAD
```

Coverage snapshots are stored under `.reports/coverage-<timestamp>.json` after each run.
