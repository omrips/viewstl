export class WorkerPool {
  constructor(url, { count = 2, timeout = 120000, factory } = {}) {
    this.url = url;
    this.count = Math.max(1, Math.min(4, count));
    this.timeout = timeout;
    this.factory = factory;
    this.queue = [];
    this.active = new Set();
    this.next = 0;
    this.disposed = false;
  }
  run(task, progress, transfer = []) {
    if (this.disposed) return Promise.reject(new Error("Viewer disposed"));
    const id = ++this.next;
    let job;
    const promise = new Promise((resolve, reject) => {
      job = { id, task, progress, transfer, resolve, reject };
      this.queue.push(job);
    });
    promise.cancel = () => this.cancel(job);
    this.pump();
    return promise;
  }
  cancel(job) {
    if (job.done) return;
    job.done = true;
    this.queue = this.queue.filter((j) => j !== job);
    clearTimeout(job.timer);
    job.worker?.terminate();
    this.active.delete(job);
    job.reject(new DOMException("Loading cancelled", "AbortError"));
    this.pump();
  }
  pump() {
    while (
      !this.disposed &&
      this.active.size < this.count &&
      this.queue.length
    ) {
      const job = this.queue.shift();
      this.active.add(job);
      const end = (error, result) => {
        if (job.done) return;
        job.done = true;
        clearTimeout(job.timer);
        job.worker?.terminate();
        this.active.delete(job);
        error ? job.reject(error) : job.resolve(result);
        this.pump();
      };
      try {
        job.worker = this.factory
          ? this.factory()
          : new Worker(this.url, { type: "module", name: "ViewSTL parser" });
        job.worker.onmessage = ({ data }) => {
          if (data.id !== job.id) return;
          if (data.progress) {
            job.progress?.(data.progress);
            return;
          }
          end(data.error ? new Error(data.error) : null, data.result);
        };
        job.worker.onerror = (e) => {
          e.preventDefault();
          end(
            new Error(
              e.message ||
                "Worker failed; check worker URL and Content Security Policy",
            ),
          );
        };
        job.worker.onmessageerror = () =>
          end(new Error("Invalid worker response"));
        job.timer = setTimeout(
          () => end(new Error("File processing timed out")),
          this.timeout,
        );
        job.worker.postMessage({ id: job.id, task: job.task }, job.transfer);
      } catch (error) {
        end(error);
      }
    }
  }
  clear() {
    for (const job of [...this.queue, ...this.active]) this.cancel(job);
  }
  dispose() {
    this.disposed = true;
    this.clear();
  }
}
