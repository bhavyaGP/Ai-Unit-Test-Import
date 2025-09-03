// runner.js
// Requires:
// const { execSync } = require('child_process');
// const fs = require('fs');
// const path = require('path');

const { execSync } = require('child_process');
const fs = require('fs');
const path = require('path');

function runTestsAndGetCoverage(cwd, options = {}) {
  try {
    execSync(`npm --prefix ${cwd} test --silent`, { stdio: 'inherit' });
  } catch (e) {
    // continue - tests may have failing assertions but coverage may still be generated
  }

  const covPath = path.join(cwd, 'coverage', 'coverage-summary.json');
  if (!fs.existsSync(covPath)) {
    return { success: false, coverage: 0, details: null };
  }
  const cov = JSON.parse(fs.readFileSync(covPath, 'utf8'));
  const total = cov.total || {};
  const pct = total.lines && total.lines.pct ? total.lines.pct : 0;
  // persist coverage snapshot
  try {
    const reportsDir = path.join(cwd, '.reports');
    if (!fs.existsSync(reportsDir)) fs.mkdirSync(reportsDir, { recursive: true });
    const ts = new Date().toISOString().replace(/[:.]/g, '-');
    fs.writeFileSync(path.join(reportsDir, `coverage-${ts}.json`), JSON.stringify(cov, null, 2), 'utf8');
  } catch (e) {}
  return { success: true, coverage: pct, details: total };
}

module.exports = { runTestsAndGetCoverage };
