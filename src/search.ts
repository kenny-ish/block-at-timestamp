export type GetTimestamp = (block: number) => Promise<number>;

/**
 * First block in [0, head] whose timestamp is >= target.
 *
 * 1. Newton-style jumps: measure the local block time around the current block and jump by
 *    (target - ts) / blockTime. Local block time adapts to eras with different block times
 *    (e.g. pre/post-merge Ethereum), so this lands within a few blocks in 2-3 jumps.
 * 2. Gallop outward from there (1, 2, 4, ... blocks) until the target is bracketed.
 * 3. Binary search inside the bracket.
 */
export async function blockAt(getTs: GetTimestamp, head: number, target: number): Promise<number> {
  const cache = new Map<number, number>();
  const ts = async (n: number) => {
    if (!cache.has(n)) cache.set(n, await getTs(n));
    return cache.get(n)!;
  };
  if ((await ts(head)) < target) throw new Error("target is after the chain head");
  if ((await ts(0)) >= target) return 0;

  let n = head;
  for (let i = 0; i < 8; i++) {
    const span = Math.min(1000, n);
    if (span < 1) break;
    const rate = Math.max(1e-3, ((await ts(n)) - (await ts(n - span))) / span);
    const step = Math.round((target - (await ts(n))) / rate);
    if (Math.abs(step) <= 1) break;
    n = Math.min(head, Math.max(1, n + step));
  }

  // invariant after galloping: ts(lo) < target <= ts(hi)
  let lo: number;
  let hi: number;
  if ((await ts(n)) >= target) {
    hi = n;
    lo = n - 1;
    for (let d = 2; lo > 0 && (await ts(lo)) >= target; d *= 2) {
      hi = lo;
      lo = Math.max(0, n - d);
    }
  } else {
    lo = n;
    hi = n + 1;
    for (let d = 2; (await ts(hi)) < target; d *= 2) {
      lo = hi;
      hi = Math.min(head, n + d);
    }
  }
  while (hi - lo > 1) {
    const mid = Math.floor((lo + hi) / 2);
    if ((await ts(mid)) < target) lo = mid;
    else hi = mid;
  }
  return hi;
}
