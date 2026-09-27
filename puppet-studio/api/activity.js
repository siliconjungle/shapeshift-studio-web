const pending = new Set();
let generation = 0;
let lastError = null;
export function trackTask(value) {
  if (!value?.then) return value;
  const promise = Promise.resolve(value);
  pending.add(promise); generation++;
  promise.then(() => { pending.delete(promise); generation++; }, error => { pending.delete(promise); generation++; lastError = error; });
  return promise;
}
export function reportActivityError(error) { lastError = error instanceof Error ? error : Error(String(error)); }
export function clearActivityError() { lastError = null; }
export async function waitForActivity({ timeout = 30000, errors = true } = {}) {
  const end = performance.now() + timeout;
  for (;;) {
    const before = generation;
    if (pending.size) await Promise.race([Promise.allSettled([...pending]), new Promise(resolve => setTimeout(resolve, 25))]);
    else await new Promise(resolve => setTimeout(resolve, 30));
    if (performance.now() >= end) throw Error('Editor work is still pending');
    if (!pending.size && before === generation) break;
  }
  if (errors && lastError) throw lastError;
}
export const activityState = () => ({ pending: pending.size });
// Capture before asynchronous reads; revalidate immediately before committing.
export function revisionGuard(read) {
  const revision = read();
  return () => { if (read() !== revision) throw Error('The project changed while this operation was loading; inspect it and try again.'); };
}
