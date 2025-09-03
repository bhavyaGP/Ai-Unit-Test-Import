// orchestrator/index.js
// Requires:
// const path = require('path');
// const fs = require('fs');
// const { getGitDiff } = require('../change-detector');
// const { analyzeFileChange } = require('../analyzer');
// const { generateTestsForImpacted } = require('../test-generator-agent');
const { runForFile, MutationAgent } = require('../langgraph_workflow_local');
// const { saveTestSnippet, findTestPathForSource } = require('../test-saver');
// const { runTestsAndGetCoverage } = require('../runner');
// const { createBranchAndCommit, createPullRequest } = require('../git-ops');
// const { mutateAndGenerate } = require('../mutation-agent');

const path = require('path');
const fs = require('fs');
const { getGitDiff } = require('../change-detector');
const { analyzeFileChange } = require('../analyzer');
const { generateTestsForImpacted } = require('../test-generator-agent');
const { runForFile, MutationAgent } = require('../langgraph_workflow_local');
const { saveTestSnippet, findTestPathForSource } = require('../test-saver');
const { runTestsAndGetCoverage } = require('../runner');
const { createBranchAndCommit, createPullRequest } = require('../git-ops');
const { mutateAndGenerate } = require('../mutation-agent');

async function orchestrate({ prevCommit, currCommit, cwd, firstTime = false }) {
  const changes = await getGitDiff(prevCommit, currCommit, { cwd });

  if (firstTime) {
    // find all .js files under cwd/src
    const allFiles = [];
    function walk(dir) {
      for (const name of fs.readdirSync(dir)) {
        const full = path.join(dir, name);
        if (fs.statSync(full).isDirectory()) walk(full);
        else if (name.endsWith('.js')) allFiles.push(path.relative(cwd, full));
      }
    }
    const srcDir = path.join(cwd, 'src');
    if (fs.existsSync(srcDir)) walk(srcDir);
    for (const f of allFiles) {
      const analysis = analyzeFileChange(f, '', cwd);
      if (analysis.impacted.length) {
        const tests = await runForFile({ cwd, filePath: f, impactedNodes: analysis.impacted });
        for (const t of tests) saveTestSnippet(cwd, t, 'overwrite');
      }
    }
    const cov = runTestsAndGetCoverage(cwd);
    return { status: 'bootstrapped', coverage: cov.coverage };
  }

  const impactedSpecs = [];
  for (const c of changes) {
    if (c.status === 'D') {
      const testPath = path.join(cwd, findTestPathForSource(c.filePath));
      if (fs.existsSync(testPath)) fs.unlinkSync(testPath);
      continue;
    }
    const analysis = analyzeFileChange(c.filePath, c.diff, cwd);
    if (analysis.impacted && analysis.impacted.length) impactedSpecs.push(analysis);
  }

  const generatedSnippets = [];
  for (const spec of impactedSpecs) {
    const tests = await runForFile({ cwd, filePath: spec.filePath, impactedNodes: spec.impacted });
    // convert to same shape as previous tests (node + testCode)
    for (const tt of tests) generatedSnippets.push({ filePath: spec.filePath, node: tt.node, testCode: tt.testCode });
  }

  for (const s of generatedSnippets) {
    // Heuristic: if file changed a lot -> overwrite else append
    const fullPath = path.join(cwd, s.filePath);
    const origSize = fs.existsSync(fullPath) ? fs.statSync(fullPath).size : 0;
    const op = 'append';
    saveTestSnippet(cwd, s, op);
  }

  let cov = runTestsAndGetCoverage(cwd);
  const threshold = parseFloat(process.env.COVERAGE_THRESHOLD || '80');

  if (cov.coverage >= threshold) {
    const branchName = `auto/tests/${Date.now()}`;
    const commitMessage = `chore(tests): add/modify tests — coverage ${cov.coverage}%`;
    await createBranchAndCommit(cwd, branchName, commitMessage, { name: process.env.GIT_AUTHOR_NAME, email: process.env.GIT_AUTHOR_EMAIL });
    // Optional PR metadata - attempt to parse remote origin to get owner/repo
    const remoteUrl = execSafe(`git -C ${cwd} remote get-url origin`);
    let owner, repo;
    try {
      if (remoteUrl) {
        const m = /[:/]([^/]+)\/([^/]+)(?:\.git)?$/.exec(remoteUrl.trim());
        if (m) { owner = m[1]; repo = m[2]; }
      }
    } catch(e) {}
    if (owner && repo) {
      const pr = await createPullRequest({ owner, repo, headBranch: branchName, title: commitMessage, body: 'Automated tests added by AI test generator' });
      return { status: 'done', coverage: cov.coverage, pr };
    }
    return { status: 'done', coverage: cov.coverage };
  }

  let iterations = 0;
  const maxIter = parseInt(process.env.REGENERATE_MAX_ITER || '5', 10);
  while (cov.coverage < threshold && iterations < maxIter) {
    for (const spec of impactedSpecs) {
      // Use MutationAgent to create additional tests
      const existingTestsPath = path.join(cwd, findTestPathForSource(spec.filePath));
      let existing = '';
      try { existing = fs.readFileSync(existingTestsPath, 'utf8'); } catch(e) { existing = ''; }
      const mOut = await MutationAgent({ filePath: spec.filePath, coverageReport: cov.coverage, existingTests: existing });
      saveTestSnippet(cwd, { filePath: spec.filePath, node: { name: 'mutation' }, testCode: mOut.additionalTestCode }, 'append');
    }
    cov = runTestsAndGetCoverage(cwd);
    iterations += 1;
  }

  if (cov.coverage >= threshold) {
    const branchName = `auto/tests/${Date.now()}`;
    const commitMessage = `chore(tests): add tests after mutation — coverage ${cov.coverage}%`;
    await createBranchAndCommit(cwd, branchName, commitMessage, { name: process.env.GIT_AUTHOR_NAME, email: process.env.GIT_AUTHOR_EMAIL });
    return { status: 'done_after_mutation', coverage: cov.coverage };
  } else {
    return { status: 'coverage_not_met', coverage: cov.coverage };
  }
}

function execSafe(cmd) {
  try {
    const { execSync } = require('child_process');
    return execSync(cmd, { encoding: 'utf8' }).trim();
  } catch (e) {
    return null;
  }
}

module.exports = { orchestrate };
