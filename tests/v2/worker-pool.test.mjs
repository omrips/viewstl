import { test } from "node:test";
import assert from "node:assert/strict";
import { WorkerPool } from "../../src/worker-pool.js";
function factory(workers) {
  return () => {
    const worker = {
      terminated: false,
      postMessage(message) {
        this.message = message;
      },
      terminate() {
        this.terminated = true;
      },
      finish(result) {
        this.onmessage({ data: { id: this.message.id, result } });
      },
    };
    workers.push(worker);
    return worker;
  };
}
test("worker concurrency is bounded and queued tasks start after completion", async () => {
  const workers = [],
    pool = new WorkerPool("", { count: 2, factory: factory(workers) });
  const jobs = [1, 2, 3].map((n) => pool.run({ n }));
  assert.equal(workers.length, 2);
  workers[0].finish("a");
  assert.equal(workers.length, 3);
  workers[1].finish("b");
  workers[2].finish("c");
  assert.deepEqual(await Promise.all(jobs), ["a", "b", "c"]);
  assert.equal(pool.active.size, 0);
  assert.ok(workers.every((w) => w.terminated));
  pool.dispose();
});
test("cancellation rejects queued and running tasks and never revives them", async () => {
  const workers = [],
    pool = new WorkerPool("", { count: 1, factory: factory(workers) }),
    a = pool.run({}),
    b = pool.run({});
  const results = Promise.allSettled([a, b]);
  b.cancel();
  a.cancel();
  assert.ok(
    (await results).every(
      (v) => v.status === "rejected" && v.reason.name === "AbortError",
    ),
  );
  assert.equal(workers.length, 1);
  assert.equal(pool.active.size, 0);
  pool.dispose();
});
test("worker errors and timeouts settle the queue", async () => {
  const workers = [],
    pool = new WorkerPool("", {
      count: 1,
      timeout: 15,
      factory: factory(workers),
    }),
    a = pool.run({}),
    b = pool.run({});
  const results = Promise.allSettled([a, b]);
  workers[0].onerror({ message: "failed", preventDefault() {} });
  const settled = await results;
  assert.match(settled[0].reason.message, /failed/);
  assert.match(settled[1].reason.message, /timed out/);
  assert.equal(pool.active.size, 0);
  pool.dispose();
});
test("disposing a pool cancels all work and refuses new tasks", async () => {
  const workers = [],
    pool = new WorkerPool("", { count: 1, factory: factory(workers) });
  const results = Promise.allSettled([pool.run({}), pool.run({})]);
  pool.dispose();
  assert.ok((await results).every((r) => r.status === "rejected"));
  await assert.rejects(pool.run({}), /disposed/);
  assert.equal(pool.queue.length, 0);
});
