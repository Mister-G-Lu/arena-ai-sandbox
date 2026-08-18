/**
 * Playwright reporter: surface E2E failure details in GitHub Actions.
 *
 * The Actions job log and artifacts are not always easy to reach (large,
 * expiring, or access-limited), so on CI this reporter:
 *
 *  1. emits a `::error::` workflow command per failing test, which GitHub
 *     turns into a check-run annotation (visible in the Actions UI and
 *     through the checks API), and
 *  2. appends the failing test names to `$GITHUB_JOB_SUMMARY` for the job
 *     summary section.
 *
 * No-op when not running in GitHub Actions.
 */

function singleLine(text) {
  return String(text).replace(/\s+/g, ' ').trim();
}

export default class CiE2eSummaryReporter {
  constructor() {
    this.failures = [];
  }

  onTestEnd(test, result) {
    if (result.status !== 'passed' && result.status !== 'skipped') {
      const name = test.titlePath().join(' › ');
      const message = (result.error && result.error.message) || String(result.error || '');
      this.failures.push({ name, message });

      const { file, line } = test.location;
      const summary = `E2E FAILED: ${name} — ${singleLine(message).slice(0, 240)}`;
      process.stdout.write(`::error file=${file},line=${line}::${summary}\n`);
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
