/**
 * Playwright reporter: surface E2E failure details in the GitHub Actions job
 * summary.
 *
 * The Actions job log and artifacts are not always easy to reach (large,
 * expiring, or access-limited), so on CI this reporter appends every failing
 * test's name and first error line to `$GITHUB_JOB_SUMMARY`. The job summary
 * is rendered on the Actions job page and exposed through the checks API
 * (`output.summary`), making E2E regressions visible at a glance.
 *
 * No-op when not running in GitHub Actions.
 */

export default class CiE2eSummaryReporter {
  constructor() {
    this.failures = [];
  }

  onTestEnd(test, result) {
    if (result.status !== 'passed' && result.status !== 'skipped') {
      this.failures.push({
        name: test.titlePath().join(' › '),
        message: (result.error && result.error.message) || String(result.error || ''),
      });
    }
  }

  async onEnd() {
    const summaryPath =
      process.env.GITHUB_JOB_SUMMARY || process.env.GITHUB_STEP_SUMMARY;
    if (!summaryPath || this.failures.length === 0) return;

    const fs = await import('node:fs/promises');
    const lines = [
      '',
      '## E2E failures',
      '',
      ...this.failures.map((failure) => {
        const message = failure.message.slice(0, 600);
        return [
          `- \`${failure.name}\``,
          '  ```',
          message || '(no error message)',
          '  ```',
        ].join('\n');
      }),
      '',
    ];
    await fs.appendFile(summaryPath, lines.join('\n'));
  }
}
