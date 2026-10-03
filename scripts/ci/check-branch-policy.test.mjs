import assert from 'node:assert/strict';
import test from 'node:test';
import { checkBranchPolicy } from './check-branch-policy.mjs';

const release = {
  eventName: 'pull_request', baseRef: 'main', headRef: 'dev',
  repository: 'annastriw/employee-attendance-system',
  headRepository: 'annastriw/employee-attendance-system',
};

test('release accepts dev from the same repository', () => {
  assert.doesNotThrow(() => checkBranchPolicy(release));
});
test('only dev can propose a production release', () => {
  for (const headRef of ['main', 'codex/feature', 'feature/profile', '']) {
    assert.throws(() => checkBranchPolicy({ ...release, headRef }));
  }
});
test('release PR must target main in this repository', () => {
  assert.throws(() => checkBranchPolicy({ ...release, baseRef: 'other' }));
  assert.throws(() => checkBranchPolicy({ ...release, headRepository: 'other/fork' }));
});
test('pushes and unsupported events are not release candidates', () => {
  for (const eventName of ['push', 'workflow_dispatch']) {
    assert.throws(() => checkBranchPolicy({ ...release, eventName }));
  }
});
