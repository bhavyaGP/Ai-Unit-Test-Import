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
  const model = opts.model || process.env.LLM_MODEL || 'wizardcoder:latest';
  const endpoint = process.env.OLLAMA_ENDPOINT || 'http://localhost:11434/api/generate';
  const body = { model, prompt, stream: false };
  if (opts.temperature != null) body.temperature = opts.temperature;
  if (opts.max_tokens != null) body.max_tokens = opts.max_tokens;
  try {
    const res = await axios.post(endpoint, body, { timeout: 50 * 60 * 1000 }); 
    const data = res && res.data;
    if (!data) return '';

    // Ollama / wrapper variations
    if (typeof data === 'string') return data;
    if (data.response) return data.response;
    if (data.output) return data.output;
    if (data.results && Array.isArray(data.results) && data.results.length) {
      const r = data.results[0];
      if (r && (r.content || r.output)) return r.content || r.output;
    }
    // OpenAI-style choices
    if (data.choices && Array.isArray(data.choices) && data.choices.length) {
      const c = data.choices[0];
      if (c.text) return c.text;
      if (c.message) return c.message.content || JSON.stringify(c.message);
    }
    // Some endpoints return an array
    if (Array.isArray(data) && data.length) {
      const first = data[0];
      if (typeof first === 'string') return first;
      if (first.content) return first.content;
      if (first.output) return first.output;
    }
    // fallback: stringify
    return JSON.stringify(data);
  } catch (err) {
    console.error('❌ Ollama call failed:', err.message || err);
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
