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
  const workingChanges = options.workingChanges || false;

  let nameStatus;
  let diffCommand;

  if (workingChanges || (!prevCommit && !currCommit)) {
    // Handle uncommitted changes
    nameStatus = execSync(`git -C ${cwd} status --porcelain`, { encoding: 'utf8' }).trim();
    diffCommand = (filePath) => `git -C ${cwd} diff --no-color "${filePath}"`;
  } else {
    // Handle committed changes
    nameStatus = execSync(`git -C ${cwd} diff --name-status ${prevCommit} ${currCommit}`, { encoding: 'utf8' }).trim();
    diffCommand = (filePath) => `git -C ${cwd} diff -U0 --no-color ${prevCommit} ${currCommit} -- "${filePath}"`;
  }

  const lines = nameStatus ? nameStatus.split('\n') : [];
  const results = [];

  for (const line of lines) {
    let status, filePath;
    if (workingChanges || (!prevCommit && !currCommit)) {
      // Parse git status --porcelain output
      if (line.length < 3) continue;
      status = line.substring(0, 2).trim();
      filePath = line.substring(3).trim();
      if ((status === 'M' || status === 'A' || status === '??') && filePath) {
        results.push({ status: status === '??' ? 'A' : status, filePath });
      }
    } else {
      // Parse git diff --name-status output
      const parts = line.split('\t');
      if (parts.length >= 2) {
        status = parts[0];
        filePath = parts.slice(1).join('\t');
        results.push({ status, filePath });
      }
    }
  }

  for (const r of results) {
    if (r.status === 'A' || r.status === 'M') {
      if (workingChanges || (!prevCommit && !currCommit)) {
        // For uncommitted changes, just get the current content
        r.diff = `Modified: ${r.filePath}`;
        try {
          r.currentContent = fs.readFileSync(path.join(cwd, r.filePath), 'utf8');
        } catch (e) {
          r.currentContent = '';
        }
      } else {
        // For committed changes, get the actual diff
        const diff = execSync(`git -C ${cwd} diff -U0 --no-color ${prevCommit} ${currCommit} -- "${r.filePath}"`, { encoding: 'utf8' });
        r.diff = diff;
        try {
          r.currentContent = fs.readFileSync(path.join(cwd, r.filePath), 'utf8');
        } catch (e) {
          r.currentContent = '';
        }
      }
    } else {
      r.diff = '';
      r.currentContent = '';
    }
  }

  // Filter to only include files in the src folder
  const srcResults = results.filter(r => r.filePath.startsWith('src/'));

  return srcResults;
}

module.exports = { getGitDiff };
