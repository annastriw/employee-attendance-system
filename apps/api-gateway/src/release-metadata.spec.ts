import { releaseVersion } from './release-metadata';

describe('releaseVersion', () => {
  const originalReleaseSha = process.env.RELEASE_SHA;

  afterEach(() => {
    if (originalReleaseSha === undefined) delete process.env.RELEASE_SHA;
    else process.env.RELEASE_SHA = originalReleaseSha;
  });

  it('returns the full commit SHA for a production image', () => {
    process.env.RELEASE_SHA = 'a'.repeat(40);

    expect(releaseVersion()).toBe('a'.repeat(40));
  });

  it('returns local when no valid image SHA is configured', () => {
    delete process.env.RELEASE_SHA;
    expect(releaseVersion()).toBe('local');

    process.env.RELEASE_SHA = 'not-a-commit';
    expect(releaseVersion()).toBe('local');
  });
});
