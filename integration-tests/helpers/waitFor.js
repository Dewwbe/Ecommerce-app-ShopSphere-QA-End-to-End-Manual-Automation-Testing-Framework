/**
 * Polls `fn` until it returns a truthy value, or throws after the timeout.
 * Used instead of fixed sleeps so tests are fast when the system is fast
 * and tolerant when asynchronous events take longer.
 */
async function waitFor(fn, { timeoutMs = 15000, intervalMs = 250, description = "condition" } = {}) {
  const deadline = Date.now() + timeoutMs;
  let lastError;
  while (Date.now() < deadline) {
    try {
      const result = await fn();
      if (result) return result;
    } catch (err) {
      lastError = err;
    }
    await new Promise((r) => setTimeout(r, intervalMs));
  }
  throw new Error(`Timed out after ${timeoutMs}ms waiting for ${description}` + (lastError ? ` (last error: ${lastError.message})` : ""));
}

module.exports = { waitFor };
