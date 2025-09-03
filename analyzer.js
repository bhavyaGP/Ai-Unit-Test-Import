// analyzer.js
// Requires:
// const recast = require('recast');
// const babelParser = require('@babel/parser');
// const fs = require('fs');
// const path = require('path');

const recast = require('recast');
const babelParser = require('@babel/parser');
const fs = require('fs');
const path = require('path');

function parseSourceToAST(source) {
  const ast = babelParser.parse(source, {
    sourceType: 'module',
    plugins: ['jsx', 'classProperties', 'optionalChaining']
  });
  return ast;
}

function extractTopLevelFunctionsAndExports(ast) {
  const nodes = [];
  recast.types.visit(ast, {
    visitFunctionDeclaration(path) {
      const node = path.node;
      nodes.push({ type: 'function', name: node.id ? node.id.name : null, loc: node.loc });
      this.traverse(path);
    },
    visitClassDeclaration(path) {
      const node = path.node;
      nodes.push({ type: 'class', name: node.id ? node.id.name : null, loc: node.loc });
      this.traverse(path);
    },
    visitVariableDeclaration(path) {
      // capture exported arrow functions assigned to const
      this.traverse(path);
    }
  });
  return nodes;
}

function analyzeFileChange(filePath, diff, cwd) {
  const changedRanges = [];
  const regex = /^@@ -\d+(?:,\d+)? \+(\d+)(?:,(\d+))? @@/gm;
  let m;
  while ((m = regex.exec(diff)) !== null) {
    const start = parseInt(m[1], 10);
    const count = m[2] ? parseInt(m[2], 10) : 1;
    changedRanges.push({ start, end: start + count - 1 });
  }

  let currentSource = '';
  try {
    currentSource = fs.readFileSync(path.join(cwd || process.cwd(), filePath), 'utf8');
  } catch (e) {
    currentSource = '';
  }
  const ast = currentSource ? parseSourceToAST(currentSource) : null;
  const topNodes = ast ? extractTopLevelFunctionsAndExports(ast) : [];
  const impacted = [];
  for (const n of topNodes) {
    if (!n.loc) continue;
    for (const r of changedRanges) {
      if (n.loc.start.line <= r.end && n.loc.end.line >= r.start) {
        impacted.push(n);
        break;
      }
    }
  }

  return { filePath, impacted, changedRanges, currentSource };
}

module.exports = { analyzeFileChange, parseSourceToAST, extractTopLevelFunctionsAndExports };
