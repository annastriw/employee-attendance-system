import assert from 'node:assert/strict';
import { test } from 'node:test';
import { rewriteRequestCookies, rewriteResponseCookie } from './dev-proxy-cookies.mjs';

test('restores refresh cookie names for both roles without changing values or other cookies', () => {
  assert.equal(
    rewriteRequestCookies('theme=dark; auth_refresh_admin=abc==; auth_refresh_employee=xyz; other_auth_refresh_admin=keep'),
    'theme=dark; __Host-auth_refresh_admin=abc==; __Host-auth_refresh_employee=xyz; other_auth_refresh_admin=keep',
  );
});

test('leaves missing, empty, unrelated and already prefixed request cookies unchanged', () => {
  for (const cookie of [undefined, '', '__Host-auth_refresh_admin=abc; session=auth_refresh_employee=xyz', 'auth_refresh_other=abc']) {
    assert.equal(rewriteRequestCookies(cookie), cookie);
  }
});

test('handles cookie boundaries without requiring a space after semicolon', () => {
  assert.equal(rewriteRequestCookies('auth_refresh_employee=abc;auth_refresh_admin=def'), '__Host-auth_refresh_employee=abc;__Host-auth_refresh_admin=def');
});

test('makes production refresh Set-Cookie usable on localhost while preserving path and SameSite', () => {
  assert.equal(
    rewriteResponseCookie('__Host-auth_refresh_employee=abc==; Path=/; HttpOnly; Secure; SameSite=Lax; Domain=example.com'),
    'auth_refresh_employee=abc==; Path=/; HttpOnly; SameSite=Lax',
  );
});

test('rewrites logout clear cookie with its expiry intact', () => {
  assert.equal(
    rewriteResponseCookie('__Host-auth_refresh_admin=; Path=/; Secure; Expires=Thu, 01 Jan 1970 00:00:00 GMT; SameSite=Lax'),
    'auth_refresh_admin=; Path=/; Expires=Thu, 01 Jan 1970 00:00:00 GMT; SameSite=Lax',
  );
});

test('does not remove host prefix from unrelated cookie names or cookie values', () => {
  assert.equal(rewriteResponseCookie('__Host-other=__Host-value; Path=/'), '__Host-other=__Host-value; Path=/');
});
