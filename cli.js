// cli.js
// Simple CLI to run orchestrator
// Usage:
// node cli.js --bootstrap
// node cli.js --prev <sha> --curr <sha>

const { orchestrate } = require('./orchestrator/index');
const path = require('path');

const args = process.argv.slice(2);
const cwd = process.cwd();

if (args.includes('--bootstrap')) {
  (async () => {
    const res = await orchestrate({ prevCommit: '', currCommit: '', cwd, firstTime: true });
    console.log('Bootstrap result:', res);
  })();
} else {
  const prevIndex = args.indexOf('--prev');
  const currIndex = args.indexOf('--curr');
  const prev = prevIndex !== -1 ? args[prevIndex+1] : 'HEAD~1';
  const curr = currIndex !== -1 ? args[currIndex+1] : 'HEAD';
  (async () => {
    const res = await orchestrate({ prevCommit: prev, currCommit: curr, cwd, firstTime: false });
    console.log('Run result:', res);
  })();
}
