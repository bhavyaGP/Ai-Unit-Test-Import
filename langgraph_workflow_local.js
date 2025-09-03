// langgraph_workflow_local.js
// Minimal local "LangGraph-like" workflow implementation in Node.js.
// This file defines two agents: TestGeneratorAgent and MutationAgent.
// It uses the local Ollama-backed callLLM from test-generator-agent.js
// Requires:
// const { callLLM } = require('./test-generator-agent');
// const fs = require('fs');
// const path = require('path');

const { callLLM } = require('./test-generator-agent');
const fs = require('fs');
const path = require('path');

/**
 * Test Generator Agent
 * Input: { filePath, node, source }
 * Output: { testCode }
 */
async function TestGeneratorAgent({ filePath, node, source }) {
  const prompt = `You are TestGeneratorAgent. Produce focused Jest tests for the node: ${node.name || node.type}
File: ${filePath}
Code:
\`\`\`js
${source}
\`\`\`
Requirements:
- Output only the test code annotated with /* TEST_FOR: <name> */ markers.
- Use Jest (describe/it) and keep tests deterministic.
`;
  const testCode = await callLLM(prompt, { model: process.env.LLM_MODEL });
  return { testCode };
}

/**
 * Mutation Agent
 * Input: { filePath, coverageReport, existingTests }
 * Output: { additionalTestCode }
 *
 * This agent is invoked when coverage < threshold.
 * It focuses on generating tests that target missing branches and edge cases.
 */
async function MutationAgent({ filePath, coverageReport, existingTests }) {
  const prompt = `You are MutationAgent. The current coverage for ${filePath} is ${coverageReport}%.
Existing tests:
\`\`\`
${existingTests || ''}
\`\`\`
Please generate additional Jest tests to improve branch and edge-case coverage. Annotate outputs with /* TEST_FOR: mutation */
Return only the test code.`;
  const additionalTestCode = await callLLM(prompt, { model: process.env.LLM_MODEL });
  return { additionalTestCode };
}

/**
 * Runner: orchestrates for one file's impacted nodes.
 * - calls TestGeneratorAgent for each impacted node
 * - saves returned test code blocks
 * - returns combined test snippets
 */
async function runForFile({ cwd, filePath, impactedNodes }) {
  const source = fs.readFileSync(path.join(cwd, filePath), 'utf8');
  const snippets = [];
  for (const node of impactedNodes) {
    const out = await TestGeneratorAgent({ filePath, node, source });
    snippets.push({ node, testCode: out.testCode });
  }
  return snippets;
}

module.exports = { TestGeneratorAgent, MutationAgent, runForFile };
