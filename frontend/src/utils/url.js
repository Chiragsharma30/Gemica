// True only for complete https:// links (what the API accepts for product photos).
export function isHttpsUrl(value) {
  try {
    const u = new URL(String(value).trim());
    return u.protocol === 'https:' && Boolean(u.hostname.includes('.'));
  } catch {
    return false;
  }
}
