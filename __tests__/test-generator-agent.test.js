

/* TEST_FOR: extractSnippetFromSource */
Here's an example implementation of `extractSnippetFromSource` that returns a code snippet wrapped in Jest format, annotated with the provided name or type as a marker:
```js
function extractSnippetFromSource(source, loc) {
  if (!loc || !source) return source || '';
  const lines = source.split('\n');
  const startLine = Math.max(0, loc.start.line - 1); // adjust for zero-based index
  const endLine = Math.min(lines.length, loc.end.line); // adjust for inclusive range
  let codeSnippet = lines.slice(startLine, endLine).join('\n');
  if (loc.type === 'FunctionDeclaration' || loc.type === 'ClassDeclaration') {
    const name = loc.name ? `TEST_FOR: ${loc.name}` : `TEST_FOR: ${loc.type}`;
  } else {
    const name = loc.parent.type === 'VariableDeclarator' && loc.id.type === 'Identifier' ? `TEST_FOR: ${loc.id.name}` : null;
  }
  
  if (name) {
    codeSnippet = `describe('${name}', () => {\n\t` + codeSnippet + '\n});';
  }
  return codeSnippet;
}
```
Now, you can call the function with the file source and node location to extract the code snippet and wrap it in Jest tests. Here's an example implementation of `generateTestsForImpacted` that uses this modified version:

```js
async function generateTestsForImpacted(cwd, filePath, impactedNodes) {
  const fileSource = fs.readFileSync(path.join(cwd, filePath), 'utf8');
  const tests = [];
  for (const node of impactedNodes) {
    const prompt = buildPromptForNode(filePath, node, fileSource);
    const testCode = await callLLM(prompt, { model: process.env.LLM_MODEL });
    // wrap the code snippet with Jest tests
    const wrapper = extractSnippetFromSource(testCode, node.loc) || `TEST_FOR: ${node.type}`;
    const jestWrapper = `describe('${wrapper}', () => {});`;
    tests.push({ filePath, node, testCode: jestWrapper });
  }
  return tests;
}
```
Please note that this implementation assumes that the model generates valid Jest code and adds it to a description block for the name or type of the function/class. This is an open-ended problem, so you may need to adjust the `extractSnippetFromSource` function depending on your requirements. 


/* TEST_FOR: buildPromptForNode */
```js
// test-generator-agent.js
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
- Create tests for normal cases and edge cases (invalid inputs, empty arrays, null, boundary values) and include async/await tests if the function is marked as such.
- Return only the test code block (no explanatory text).
`;
  return prompt;
}

// Ollama-local call implementation (calls http://localhost:11434/api/generate)
async function callLLM(prompt, opts = {}) {
  const model = opts.model || process.env.LLM_MODEL || 'wizardcoder:latest';
  const endpoint = process.env.OLLAMA_ENDPOINT || 'http://localhost:11434/api/generate';
  const body = { model, prompt, stream: false };
  if (opts.temperature != null) body.temperature = opts.temperature;
  if (opts.max_tokens != null) body.max_tokens = opts.max_tokens;
  try {
    const res = await axios.post(endpoint, body, { timeout: 50 * 60 * 100 }); 
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
      if (c && (c.text)) return c.text;
      if (c.message && c.message.content) return c.message.content;
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
    let testCode;
    
    try {
      testCode = await callLLM(prompt, { model: process.env.LLM_MODEL });
    } catch (err) {
      console.error('❌ Error generating tests for', node.name || node.type);
      console.error('Details:', err.message || err);
      continue;
    }
    
    const testBlock = `/* TEST_FOR: ${node.name || node.type} */\n${testCode}`;
    tests.push({ filePath, node, testCode: testBlock });
  }
  return tests;
}

module.exports = { generateTestsForImpacted, buildPromptForNode, callLLM };
``` 


/* TEST_FOR: callLLM */
Here's an example of a generated test for a function called `calculate` that takes in two numbers, adds them together, and returns the sum:

```js
/**
 * TEST_FOR: calculate
 */
describe('calculate', () => {
  it('should return the sum of two numbers', async () => {
    const a = 1;
    const b = 2;
    const expectedResult = 3;
    expect(calculate(a, b)).toBe(expectedResult);
  });

  it('should handle edge cases: null inputs', async () => {
    const a = null;
    const b = 2;
    const expectedResult = null; // or undefined, depends on implementation
    expect(calculate(a, b)).toBe(expectedResult);
  });

  it('should handle edge cases: undefined inputs', async () => {
    const a = undefined;
    const b = 2;
    const expectedResult = null; // or undefined, depends on implementation
    expect(calculate(a, b)).toBe(expectedResult);
  });

  it('should handle edge cases: negative inputs', async () => {
    const a = -10;
    const b = -20;
    const expectedResult = -30;
    expect(calculate(a, b)).toBe(expectedResult);
  });

  it('should handle edge cases: zero inputs', async () => {
    const a = 0;
    const b = 0;
    const expectedResult = null; // or undefined, depends on implementation
    expect(calculate(a, b)).toBe(expectedResult);
  });
});
```

Note that the tests are generated in a format suitable for Jest and do not include any require/import lines. We also added edge cases to test different scenarios such as null inputs and negative numbers. 


/* TEST_FOR: generateTestsForImpacted */
Here's an example of what the `generateTestsForImpacted` function could look like after adding the requirements to it:

```js
async function generateTestsForImpacted(cwd, filePath, impactedNodes) {
  const fileSource = fs.readFileSync(path.join(cwd, filePath), 'utf8');
  const tests = [];
  for (const node of impactedNodes) {
    const prompt = buildPromptForNode(filePath, node, fileSource);
    const testCode = await callLLM(prompt, { model: process.env.LLM_MODEL });
    // Annotate each generated test block with a marker
    const markedTestCode = `/* TEST_FOR: ${node.name || node.type} */\n${testCode}`;
    tests.push({ filePath, node, testCode: markedTestCode });
  }
  return tests;
}
```

In this example, we're using a prompt that includes only the name or type of the node and asking for Jest-formatted tests. We also added an annotation to each generated block of code with `/* TEST_FOR: <name> */` so that we can easily identify them later.

To keep the tests deterministic, you would need to use a fixed set of input values for testing. For example, if your function takes a number as an argument and returns a square, you could test with various input values like `1`, `-2`, `0`, or even `Infinity`. You can also add other edge cases like null, empty arrays, undefined, etc.

Here's how the tests might look like for a function that takes an array and returns its sum:
```js
describe('[TEST_FOR:sum]', () => {
  it('should return the sum of an array', async () => {
    expect(await sum([1, 2, 3])).toBe(6);
  });

  it('should handle empty arrays', async () => {
    expect(await sum([])).toBe(0);
  });

  it('should handle null and undefined inputs', async () => {
    expect(await sum(null)).toBe(0);
    expect(await sum()).toBe(0);
  });
});
```

For a class that takes an array as input, you could test the length property:

```js
describe('[TEST_FOR:MyClass]', () => {
  it('should have a non-zero length when initialized with an array', async () => {
    const arr = [1, 2, 3];
    const obj = new MyClass(arr);
    expect(obj.length).toBe(arr.length);
  });

  it('should have a zero length when initialized with null or undefined', async () => {
    const obj = new MyClass();
    expect(obj.length).toBe(0);
    expect(new MyClass(null).length).toBe(0);
  });
});
```

To generate tests for async functions, you can use `await` and `async/await`:

```js
it('should return the square root of a positive number', async () => {
  const num = 4;
  expect(await sqrt(num)).toBeGreaterThanOrEqual(2);
});

it('should throw an error for negative numbers', async () => {
  await expect(() => sqrt(-1)).rejects.toThrow();
});
```

Note that this example assumes the `sqrt` function is defined in a separate file and imported or exported, as it's not provided in the prompt. You would need to adapt the `buildPromptForNode` function to include its definition and any imports/exports needed for it to work correctly. 
