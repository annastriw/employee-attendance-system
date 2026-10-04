// Pure cookie transforms used only by the localhost Vite proxies.
export function rewriteRequestCookies(cookie) {
  return cookie?.replace(
    /(^|;\s*)(auth_refresh_(?:admin|employee))=/g,
    '$1__Host-$2=',
  );
}

export function rewriteResponseCookie(cookie) {
  return cookie
    .replace(/^__Host-(auth_refresh_(?:admin|employee))=/, '$1=')
    .replace(/;\s*Secure(?=;|$)/gi, '')
    .replace(/;\s*Domain=[^;]+/gi, '');
}
