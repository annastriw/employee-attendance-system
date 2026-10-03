import assert from 'node:assert/strict';
import test from 'node:test';
import { checkBranchPolicy } from './check-branch-policy.mjs';

const release = {
  eventName: 'pull_request', baseRef: 'main', headRef: 'dev',
  repository: 'annastriw/employee-attendance-system',
  headRepository: 'annastriw/employee-attendance-system',
};

for (const headRef of ['codex/new-feature', 'feature/profile', 'fix/login', 'my-own-branch']) {
  test(`${headRef} can integrate through dev`, () => {
    assert.doesNotThrow(() => checkBranchPolicy({ ...release, baseRef: 'dev', headRef }));
  });
  test(`${headRef} cannot bypass dev to release`, () => {
    assert.throws(() => checkBranchPolicy({ ...release, headRef }));
  });
}
test('release accepts dev from the same repository', () => {
  assert.doesNotThrow(() => checkBranchPolicy(release));
});
test('a fork branch named dev cannot act as the release source', () => {
  assert.throws(() => checkBranchPolicy({ ...release, headRepository: 'other/fork' }));
});
test('main and dev cannot be used as feature PR sources to dev', () => {
  for (const headRef of ['main', 'dev', '']) {
    assert.throws(() => checkBranchPolicy({ ...release, baseRef: 'dev', headRef }));
  }
});
test('unknown PR target and event fail closed', () => {
  assert.throws(() => checkBranchPolicy({ ...release, baseRef: 'other' }));
  assert.throws(() => checkBranchPolicy({ ...release, eventName: 'workflow_dispatch' }));
});
test('pushes run CI without claiming PR provenance or deployment', () => {
  assert.doesNotThrow(() => checkBranchPolicy({ eventName: 'push' }));
});
