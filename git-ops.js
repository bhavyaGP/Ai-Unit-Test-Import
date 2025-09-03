// git-ops.js
// Requires:
// const { execSync } = require('child_process');
// const fs = require('fs');
// const path = require('path');
// const { Octokit } = require('@octokit/rest');

const { execSync } = require('child_process');
const fs = require('fs');
const path = require('path');
const { Octokit } = require('@octokit/rest');

async function createBranchAndCommit(cwd, branchName, commitMessage, author) {
  try {
    execSync(`git -C ${cwd} checkout -b ${branchName}`, { stdio: 'pipe' });
  } catch (e) {
    execSync(`git -C ${cwd} checkout ${branchName}`, { stdio: 'pipe' });
  }
  execSync(`git -C ${cwd} add -A`, { stdio: 'pipe' });
  execSync(`git -C ${cwd} -c user.name="${author.name}" -c user.email="${author.email}" commit -m "${commitMessage}"`, { stdio: 'pipe' });
  execSync(`git -C ${cwd} push ${process.env.GIT_REMOTE || 'origin'} ${branchName}`, { stdio: 'pipe' });
}

async function createPullRequest({ owner, repo, headBranch, baseBranch = 'main', title, body }) {
  const token = process.env.GITHUB_TOKEN;
  if (!token) throw new Error('GITHUB_TOKEN required to create PR');
  const octokit = new Octokit({ auth: token });
  const res = await octokit.pulls.create({
    owner, repo, title, head: headBranch, base: baseBranch, body
  });
  return res.data;
}

module.exports = { createBranchAndCommit, createPullRequest };
