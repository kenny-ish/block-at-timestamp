import { parseArgs } from "node:util";
import { blockAt } from "./search.ts";

const { values, positionals } = parseArgs({
  allowPositionals: true,
  options: { rpc: { type: "string", default: "https://ethereum-rpc.publicnode.com" } },
});
const input = positionals[0];
if (!input) {
  console.error("usage: node src/index.ts <ISO date | unix seconds> [--rpc URL]");
  process.exit(2);
}
const target = /^\d+$/.test(input) ? Number(input) : Math.floor(Date.parse(input) / 1000);
if (!Number.isFinite(target)) {
  console.error("cannot parse the date");
  process.exit(2);
}

let calls = 0;
async function rpc<T>(method: string, params: unknown[]): Promise<T> {
  calls++;
  const res = await fetch(values.rpc, {
    method: "POST",
    headers: { "content-type": "application/json" },
    body: JSON.stringify({ jsonrpc: "2.0", id: calls, method, params }),
  });
  const body = (await res.json()) as { result?: T; error?: { message: string } };
  if (body.result === undefined) throw new Error(body.error?.message ?? `HTTP ${res.status}`);
  return body.result;
}
const getTs = async (n: number) =>
  parseInt((await rpc<{ timestamp: string }>("eth_getBlockByNumber", ["0x" + n.toString(16), false])).timestamp, 16);

const head = parseInt(await rpc<string>("eth_blockNumber", []), 16);
const block = await blockAt(getTs, head, target);
const iso = (s: number) => new Date(s * 1000).toISOString();
console.log(`target     ${iso(target)} (${target})`);
console.log(`block      ${block}  at ${iso(await getTs(block))}`);
if (block > 0) console.log(`previous   ${block - 1}  at ${iso(await getTs(block - 1))}`);
console.log(`rpc calls  ${calls}`);
