// mutation-agent.js
// Requires: same as test-generator-agent.js

const { callLLM } = require('./test-generator-agent');

function buildMutationPrompt(filePath, coverageReport, lastTests) {
  return `
Generate additional Jest tests for ${filePath}.
Current coverage: ${coverageReport}%.
Existing tests: ${lastTests || 'N/A'}.
Focus on branches and edge-cases that are likely missing. Output only the test code and annotate with /* TEST_FOR: mutation */
`;
}

async function mutateAndGenerate(filePath, coverageReport, lastTests) {
  const prompt = buildMutationPrompt(filePath, coverageReport, lastTests);
  const testCode = await callLLM(prompt, { model: process.env.LLM_MODEL });
  return { filePath, testCode, node: { name: 'mutation' } };
}

module.exports = { mutateAndGenerate };
