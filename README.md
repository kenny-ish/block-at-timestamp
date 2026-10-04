# block-at-timestamp

Finds the first Ethereum block with `timestamp >= target`. You need that block number for balance
snapshots at a date, historical queries or backtests.

```bash
node src/index.ts 2025-01-01T00:00:00Z
node src/index.ts 1735689600 --rpc https://mainnet.base.org
```

```
$ node src/index.ts 2025-01-01T00:00:00Z --rpc https://eth.drpc.org
target     2025-01-01T00:00:00.000Z (1735689600)
block      21525891  at 2025-01-01T00:00:11.000Z
previous   21525890  at 2024-12-31T23:59:59.000Z
rpc calls  13
```

`rpc calls` includes `eth_blockNumber` and the two lookups for the printed output. A date before
the merge, such as 2018-06-01, takes about 21 calls.

The search has three phases:

1. Start at the head, measure the block time over the last 1000 blocks and jump by
   `(target - timestamp) / blockTime`, then repeat from where it landed. The block time is measured
   again at each landing point, so periods with a different block time (13 to 14 s before the merge,
   12 s after) don't throw it off. It usually lands within a few blocks after 2 or 3 jumps.
2. Step outward by 1, 2, 4, ... blocks until the target is between two known blocks.
3. Binary search between them.

Interpolating between genesis and the head doesn't work well on its own. It keeps moving the same
end of the range, and uneven block times make each guess land on the same side.

The search only depends on a `getTimestamp(n)` function, so the tests run on a synthetic chain with
irregular block times instead of the network.

```bash
npm test
```
