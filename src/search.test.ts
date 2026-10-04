import { test } from "node:test";
import assert from "node:assert/strict";
import { blockAt } from "./search.ts";

// synthetic chain: irregular block times between 1 and 20 seconds
const times: number[] = [1_600_000_000];
for (let i = 1; i <= 50_000; i++) times.push(times[i - 1] + 1 + ((i * 7919) % 20));
const getTs = async (n: number) => times[n];

test("finds the first block at or after the target", async () => {
  for (const n of [1, 17, 12_345, 49_999]) {
    assert.equal(await blockAt(getTs, 50_000, times[n]), n);
    // any target strictly after the previous block's timestamp also maps to block n
    assert.equal(await blockAt(getTs, 50_000, times[n - 1] + 1), n);
  }
});

test("target before genesis returns 0, after head throws", async () => {
  assert.equal(await blockAt(getTs, 50_000, 1), 0);
  await assert.rejects(blockAt(getTs, 50_000, times[50_000] + 10));
});

test("uses few lookups", async () => {
  let calls = 0;
  const counting = async (n: number) => {
    calls++;
    return times[n];
  };
  await blockAt(counting, 50_000, times[31_337]);
  assert.ok(calls < 30, `too many calls: ${calls}`);
});
