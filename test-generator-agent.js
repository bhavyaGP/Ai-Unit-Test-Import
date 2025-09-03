// test-generator-agent.js
// Requires:
// const axios = require('axios');
// const fs = require('fs');
// const path = require('path');

const axios = require('axios');
const fs = require('fs');
const path = require('path');

function extractSnippetFromSource(source, loc) {
  if (!loc || !source) return source || '';
  const lines = source.split('\n');
  const snippet = lines.slice(loc.start.line-1, loc.end.line).join('\n');
  return snippet;
}

function buildPromptForNode(filePath, node, fileSource, options = {}) {
  const codeSnippet = extractSnippetFromSource(fileSource, node.loc);
  const prompt = `
You are a test-generation assistant. Generate Jest unit tests for the following JS function or class.
File: ${filePath}
Node: ${node.type} ${node.name || '(anonymous)'}
Code:
\`\`\`js
${codeSnippet}
\`\`\`

Requirements:
- Generate tests in Jest format (describe/it). Do NOT add any require/import lines.
- Annotate each generated test block with a marker: /* TEST_FOR: ${node.name || node.type} */
- Create tests for normal cases and edge cases (invalid inputs, empty arrays, null, boundary values).
- If function is async, include async/await tests.
- Return only the test code block (no explanatory text).
`;
  return prompt;
}

// Ollama-local call implementation (calls http://localhost:11434/api/generate)
// Works with codellama:7b-instruct-q4_K_M served by Ollama locally
async function callLLM(prompt, opts = {}) {
  const model = opts.model || process.env.LLM_MODEL || 'codellama:7b-instruct-q4_K_M';
  const endpoint = process.env.OLLAMA_ENDPOINT || 'http://localhost:11434/api/generate';
  try {
    const res = await axios.post(endpoint, {
      model,
      prompt,
      stream: false
    }, { timeout: opts.timeout || 120000 });
    // Ollama responses vary; look for res.data.response or res.data.results
    if (res.data) {
      if (res.data.response) return res.data.response;
      if (res.data.results && Array.isArray(res.data.results) && res.data.results.length) {
        // Some Ollama wrappers return results array with content
        const r = res.data.results[0];
        if (r && (r.content || r.output)) return r.content || r.output;
      }
      // fallback: stringify body
      return typeof res.data === 'string' ? res.data : JSON.stringify(res.data);
    }
    return '';
  } catch (err) {
    console.error('❌ Ollama call failed:', err.message);
    throw err;
  }
}

async function generateTestsForImpacted(cwd, filePath, impactedNodes) {
  const fileSource = fs.readFileSync(path.join(cwd, filePath), 'utf8');
  const tests = [];
  for (const node of impactedNodes) {
    const prompt = buildPromptForNode(filePath, node, fileSource);
    const testCode = await callLLM(prompt, { model: process.env.LLM_MODEL });
    tests.push({ filePath, node, testCode });
  }
  return tests;
}

module.exports = { generateTestsForImpacted, buildPromptForNode, callLLM };
