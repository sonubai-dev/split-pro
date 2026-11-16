import { runSeniorEngineeringAudit } from '../src/lib/seniorTestSuite';

console.log('====================================================');
console.log('   VISTAROAI SENIOR ENGINEERING VERIFICATION SUITE   ');
console.log('====================================================\n');

const suite = runSeniorEngineeringAudit();

suite.results.forEach((r) => {
  const icon = r.passed ? '✅ PASS' : '❌ FAIL';
  console.log(`[${icon}] Test ${r.testNumber} [${r.category}]: ${r.name} (${r.durationMs}ms)`);
  console.log(`       Details: ${r.details}\n`);
});

console.log('----------------------------------------------------');
console.log(`Total Tests: ${suite.results.length} | Passed: ${suite.results.filter(r => r.passed).length} | Failed: ${suite.results.filter(r => !r.passed).length}`);
console.log(`Total Execution Time: ${suite.totalDurationMs}ms`);
console.log(`Verdict: ${suite.allPassed ? 'ALL TESTS PASSED (100% HEALTHY)' : 'TEST FAILURES DETECTED'}`);
console.log('====================================================');

if (!suite.allPassed) {
  process.exit(1);
}
