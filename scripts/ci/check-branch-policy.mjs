import { pathToFileURL } from 'node:url';

export function checkBranchPolicy({ eventName, baseRef, headRef, headRepository, repository }) {
  if (eventName !== 'pull_request') throw new Error('Unsupported CI event.');
  if (baseRef !== 'main' || headRef !== 'dev' || !repository || headRepository !== repository) {
    throw new Error('Production releases must use a PR from this repository\'s dev branch to main.');
  }
}

if (process.argv[1] && import.meta.url === pathToFileURL(process.argv[1]).href) {
  try {
    checkBranchPolicy({
      eventName: process.env.CI_EVENT_NAME,
      baseRef: process.env.CI_BASE_REF,
      headRef: process.env.CI_HEAD_REF,
      headRepository: process.env.CI_HEAD_REPOSITORY,
      repository: process.env.GITHUB_REPOSITORY,
    });
    console.log('PASS: only this repository\'s dev branch can propose a release to main.');
  } catch (error) {
    console.error(error.message);
    process.exitCode = 1;
  }
}
