const fetchOriginal = globalThis.fetch;
globalThis.fetch = (input, options) => {
  const target = new URL(input instanceof Request ? input.url : input);
  if (target.protocol !== 'http:' || target.hostname !== '127.0.0.1') {
    console.error('PREVIEW_OUTBOUND_FETCH_BLOCKED');
    throw new Error('Non-loopback fetch blocked by preview verification');
  }
  return fetchOriginal(input, { ...options, redirect: 'error' });
};
