const { execSync } = require('child_process');
const fs = require('fs');

console.log('===========================================================');
console.log(' SECUREID - PHASE 10 FULL REGRESSION VERIFICATION SUITE');
console.log('===========================================================');

const suites = [
  { name: 'Functional & Responsive Transitions', path: 'tests/regression/responsive' },
  { name: 'Accessibility (Axe-Core)', path: 'tests/regression/accessibility' },
  { name: 'Visual Regression & Structural Safety', path: 'tests/regression/visual' }
];

let failed = false;

for (const suite of suites) {
  console.log(`\n>>> Running Suite: ${suite.name}`);
  try {
    // We execute playwright specifically on each directory so it's clean and distinct
    execSync(`npx playwright test ${suite.path} --config=playwright.config.js`, { stdio: 'inherit' });
    console.log(`[PASS] ${suite.name} completed successfully.`);
  } catch (err) {
    console.error(`[FAIL] ${suite.name} failed!`);
    failed = true;
  }
}

console.log('\n===========================================================');
if (failed) {
  console.error('❌ PHASE 10 REGRESSION FAILED. Please review the Playwright HTML report.');
  process.exit(1);
} else {
  console.log('✅ PHASE 10 REGRESSION PASSED.');
  console.log('   All reference-fidelity and regression baselines are verified.');
}
