import { pathToFileURL } from 'node:url';

export function checkBranchPolicy({ eventName, baseRef, headRef, headRepository, repository }) {
  if (eventName === 'push') return;
  if (eventName !== 'pull_request') throw new Error('Unsupported CI event.');
  if (baseRef === 'main') {
    if (headRef !== 'dev' || !repository || headRepository !== repository) {
      throw new Error('Production releases must use a PR from this repository\'s dev branch to main.');
    }
    return;
  }
  if (baseRef === 'dev' && headRef && !['dev', 'main'].includes(headRef)) return;
  throw new Error('Feature and fix branches must target dev; release PRs must target main from dev.');
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
    console.log('PASS: branch policy (feature → dev → main). CI never deploys production.');
  } catch (error) {
    console.error(error.message);
    process.exitCode = 1;
  }
}
