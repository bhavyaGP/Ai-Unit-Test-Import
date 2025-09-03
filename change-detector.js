// change-detector.js
// Requires:
// const { execSync } = require('child_process');
// const path = require('path');
// const fs = require('fs');

const { execSync } = require('child_process');
const path = require('path');
const fs = require('fs');

function getGitDiff(prevCommit, currCommit, options = {}) {
  const cwd = options.cwd || process.cwd();

  const nameStatus = execSync(`git -C ${cwd} diff --name-status ${prevCommit} ${currCommit}`, { encoding: 'utf8' }).trim();
  const lines = nameStatus ? nameStatus.split('\n') : [];

  const results = [];
  for (const line of lines) {
    const [status, ...pathParts] = line.split('\t');
    const filePath = pathParts.join('\t');
    results.push({ status, filePath });
  }

  for (const r of results) {
    if (r.status === 'A' || r.status === 'M') {
      const diff = execSync(`git -C ${cwd} diff -U0 --no-color ${prevCommit} ${currCommit} -- "${r.filePath}"`, { encoding: 'utf8' });
      r.diff = diff;
      try {
        r.currentContent = fs.readFileSync(path.join(cwd, r.filePath), 'utf8');
      } catch (e) {
        r.currentContent = '';
      }
    } else {
      r.diff = '';
      r.currentContent = '';
    }
  }

  return results;
}

module.exports = { getGitDiff };
