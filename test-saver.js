// test-saver.js
// Requires:
// const fs = require('fs');
// const path = require('path');

const fs = require('fs');
const path = require('path');

function findTestPathForSource(sourcePath) {
  const dirname = path.dirname(sourcePath);
  const base = path.basename(sourcePath, path.extname(sourcePath));
  const testDir = path.join(dirname, '__tests__');
  return path.join(testDir, `${base}.test.js`);
}

function saveTestSnippet(cwd, testSnippetObj, operation = 'append') {
  const testPath = path.join(cwd, findTestPathForSource(testSnippetObj.filePath));
  if (!fs.existsSync(path.dirname(testPath))) fs.mkdirSync(path.dirname(testPath), { recursive: true });
  if (operation === 'overwrite') {
    fs.writeFileSync(testPath, testSnippetObj.testCode, 'utf8');
    return;
  } else if (operation === 'append') {
    const marker = `/* TEST_FOR: ${testSnippetObj.node.name || testSnippetObj.node.type} */`;
    let content = '';
    if (fs.existsSync(testPath)) content = fs.readFileSync(testPath, 'utf8');
    if (!content.includes(marker)) {
      fs.appendFileSync(testPath, `\n\n${marker}\n${testSnippetObj.testCode}\n`, 'utf8');
    }
    return;
  }
}

module.exports = { findTestPathForSource, saveTestSnippet };
