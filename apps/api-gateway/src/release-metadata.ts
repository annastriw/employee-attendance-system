const FULL_COMMIT_SHA = /^[0-9a-f]{40}$/;

export function releaseVersion(): string {
  const sha = process.env.RELEASE_SHA;
  return sha && FULL_COMMIT_SHA.test(sha) ? sha : 'local';
}
