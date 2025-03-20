// eslint-disable-file no-explicit-any
// eslint-disable-file no-unused-vars
// InMemoryKv.ts
// A simplified, in‑memory implementation of Deno KV based on the provided API surface.
// This implementation is for demonstration only and does not guarantee full ACID properties
// or all the edge‐case behaviors of Deno KV.

(Symbol as any).dispose ??= Symbol("Symbol.dispose");

//
// Type definitions matching the Deno KV API
//

export type KvKey = readonly KvKeyPart[];
export type KvKeyPart = Uint8Array | string | number | bigint | boolean;
export type KvConsistencyLevel = "strong" | "eventual";

export interface KvEntry<T> {
  key: KvKey;
  value: T;
  versionstamp: string;
}

export type KvEntryMaybe<T> =
  | KvEntry<T>
  | { key: KvKey; value: null; versionstamp: null };

export interface KvCommitResult {
  ok: true;
  versionstamp: string;
}

export interface KvListOptions {
  limit?: number;
  cursor?: string;
  reverse?: boolean;
  consistency?: KvConsistencyLevel;
  batchSize?: number;
}

export type KvListSelector =
  | { prefix: KvKey }
  | { prefix: KvKey; start: KvKey }
  | { prefix: KvKey; end: KvKey }
  | { start: KvKey; end: KvKey };

export interface KvListIterator<T>
  extends AsyncIterableIterator<KvEntry<T>> {
  get cursor(): string;
}

export interface AtomicCheck {
  key: KvKey;
  versionstamp: string | null;
}

export interface AtomicOperation {
  check(...checks: AtomicCheck[]): this;
  sum(key: KvKey, n: bigint): this;
  min(key: KvKey, n: bigint): this;
  max(key: KvKey, n: bigint): this;
  set(key: KvKey, value: unknown, options?: { expireIn?: number }): this;
  delete(key: KvKey): this;
  enqueue(
    value: unknown,
    options?: { delay?: number; keysIfUndelivered?: KvKey[] }
  ): this;
  commit(): Promise<KvCommitResult | { ok: false }>;
}

export interface Kv {
  get<T = unknown>(
    key: KvKey,
    options?: { consistency?: KvConsistencyLevel }
  ): Promise<KvEntryMaybe<T>>;
  getMany<T extends readonly unknown[]>(
    keys: readonly [...{ [K in keyof T]: KvKey }],
    options?: { consistency?: KvConsistencyLevel }
  ): Promise<{ [K in keyof T]: KvEntryMaybe<T[K]> }>;
  set(
    key: KvKey,
    value: unknown,
    options?: { expireIn?: number }
  ): Promise<KvCommitResult>;
  delete(key: KvKey): Promise<void>;
  list<T = unknown>(
    selector: KvListSelector,
    options?: KvListOptions
  ): KvListIterator<T>;
  enqueue(
    value: unknown,
    options?: { delay?: number; keysIfUndelivered?: KvKey[] }
  ): Promise<KvCommitResult>;
  listenQueue(
    handler: (value: unknown) => Promise<void> | void
  ): Promise<void>;
  atomic(): AtomicOperation;
  watch<T extends readonly unknown[]>(
    keys: readonly [...{ [K in keyof T]: KvKey }],
    options?: { raw?: boolean }
  ): ReadableStream<{ [K in keyof T]: KvEntryMaybe<T[K]> }>;
  close(): void;
  [Symbol.dispose](): void;
}

//
// Internal store types and helper functions
//

interface StoreEntry {
  key: KvKey;
  value: unknown;
  versionstamp: string;
  expireAt?: number; // in ms
}

interface InMemoryStore {
  entries: Map<string, StoreEntry>;
  version: number;
  closed: boolean;
  // Simple set of watchers for change events (used by watch)
  watchers: Set<(event: StoreEntry | { type: "delete"; key: KvKey }) => void>;
}

// Serialize a key array into a string (for Map indexing)
const serializeKey = (key: KvKey): string => JSON.stringify(key);

// A very simplistic lexicographical comparison (using the serialized form)
const compareKeys = (a: KvKey, b: KvKey): number => {
  const sa = serializeKey(a);
  const sb = serializeKey(b);
  return sa < sb ? -1 : sa > sb ? 1 : 0;
};

const keyMatchesPrefix = (key: KvKey, prefix: KvKey): boolean => {
  if (prefix.length > key.length) return false;
  for (let i = 0; i < prefix.length; i++) {
    if (key[i] !== prefix[i]) return false;
  }
  return true;
};

//
// openKv: Creates the in-memory store and returns a Kv object with full API methods.
//

export const openKv = async (path?: string): Promise<Kv> => {
  const store: InMemoryStore = {
    entries: new Map(),
    version: 0,
    closed: false,
    watchers: new Set(),
  };

  // Utility to produce a new versionstamp (simple increment)
  const nextVersionstamp = (): string => {
    store.version++;
    return store.version.toString().padStart(20, "0");
  };

  // Helper: Get an entry (if present and not expired)
  const getEntry = (key: KvKey): StoreEntry | undefined => {
    const serialized = serializeKey(key);
    const entry = store.entries.get(serialized);
    if (entry && entry.expireAt && Date.now() > entry.expireAt) {
      // Remove expired entry
      store.entries.delete(serialized);
      return undefined;
    }
    return entry;
  };

  // Notify any watchers about a change.
  const notifyWatchers = (
    event: StoreEntry | { type: "delete"; key: KvKey }
  ) => {
    for (const watcher of store.watchers) {
      watcher(event);
    }
  };

  // Implementation of list as an async generator.
  function createListIterator<T>(
    selector: KvListSelector,
    options?: KvListOptions
  ): KvListIterator<T> {
    let results: KvEntry<T>[] = [];
    // Get all (non‑expired) entries sorted by key.
    const allEntries = Array.from(store.entries.values())
      .filter((entry) => {
        if (entry.expireAt && Date.now() > entry.expireAt) return false;
        return true;
      })
      .sort((a, b) => compareKeys(a.key, b.key));

    // Apply filtering based on selector.
    if ("prefix" in selector) {
      results = allEntries.filter((entry) =>
        keyMatchesPrefix(entry.key, selector.prefix)
      ) as KvEntry<T>[];
      if ("start" in selector) {
        results = results.filter(
          (entry) => compareKeys(entry.key, selector.start) >= 0
        );
      }
      if ("end" in selector) {
        results = results.filter(
          (entry) => compareKeys(entry.key, selector.end) < 0
        );
      }
    } else if ("start" in selector && "end" in selector) {
      results = allEntries.filter(
        (entry) =>
          compareKeys(entry.key, selector.start) >= 0 &&
          compareKeys(entry.key, selector.end) < 0
      ) as KvEntry<T>[];
    }

    if (options?.reverse) {
      results = results.reverse();
    }
    if (options?.limit !== undefined) {
      results = results.slice(0, options.limit);
    }

    let index = 0;
    let _cursor = "";
    const iterator: KvListIterator<T> = {
      get cursor() {
        return _cursor;
      },
      async next() {
        if (index < results.length) {
          const value = results[index];
          _cursor = serializeKey(value.key);
          index++;
          return { value, done: false };
        } else {
          return { value: undefined, done: true };
        }
      },
      [Symbol.asyncIterator]() {
        return this;
      },
    };
    return iterator;
  }

  // A basic (and simplified) atomic operation implementation.
  class InMemoryAtomicOperation implements AtomicOperation {
    private checks: AtomicCheck[] = [];
    private mutations: ((s: InMemoryStore) => void)[] = [];

    check(...checks: AtomicCheck[]): this {
      this.checks.push(...checks);
      return this;
    }
    sum(key: KvKey, n: bigint): this {
      this.mutations.push((s: InMemoryStore) => {
        const entry = getEntry(key);
        let current = BigInt(0);
        if (entry && typeof entry.value === "bigint") {
          current = entry.value;
        }
        const newVal = current + n;
        const versionstamp = nextVersionstamp();
        s.entries.set(serializeKey(key), { key, value: newVal, versionstamp });
        notifyWatchers({ key, value: newVal, versionstamp });
      });
      return this;
    }
    min(key: KvKey, n: bigint): this {
      this.mutations.push((s: InMemoryStore) => {
        const entry = getEntry(key);
        let current = n;
        if (entry && typeof entry.value === "bigint") {
          current = entry.value < n ? entry.value : n;
        }
        const versionstamp = nextVersionstamp();
        s.entries.set(serializeKey(key), { key, value: current, versionstamp });
        notifyWatchers({ key, value: current, versionstamp });
      });
      return this;
    }
    max(key: KvKey, n: bigint): this {
      this.mutations.push((s: InMemoryStore) => {
        const entry = getEntry(key);
        let current = n;
        if (entry && typeof entry.value === "bigint") {
          current = entry.value > n ? entry.value : n;
        }
        const versionstamp = nextVersionstamp();
        s.entries.set(serializeKey(key), { key, value: current, versionstamp });
        notifyWatchers({ key, value: current, versionstamp });
      });
      return this;
    }
    set(key: KvKey, value: unknown, options?: { expireIn?: number }): this {
      this.mutations.push((s: InMemoryStore) => {
        const versionstamp = nextVersionstamp();
        const expireAt = options?.expireIn ? Date.now() + options.expireIn : undefined;
        s.entries.set(serializeKey(key), { key, value, versionstamp, expireAt });
        notifyWatchers({ key, value, versionstamp, expireAt });
      });
      return this;
    }
    delete(key: KvKey): this {
      this.mutations.push((s: InMemoryStore) => {
        s.entries.delete(serializeKey(key));
        notifyWatchers({ type: "delete", key });
      });
      return this;
    }
    enqueue(
      value: unknown,
      options?: { delay?: number; keysIfUndelivered?: KvKey[] }
    ): this {
      // For simplicity, simulate enqueue as a set under a special queue key.
      const queueKey: KvKey = ["__queue__", Date.now(), Math.random()];
      this.mutations.push((s: InMemoryStore) => {
        const versionstamp = nextVersionstamp();
        s.entries.set(serializeKey(queueKey), { key: queueKey, value, versionstamp });
        notifyWatchers({ key: queueKey, value, versionstamp });
      });
      return this;
    }
    async commit(): Promise<KvCommitResult | { ok: false }> {
      // Verify checks: if any check fails, do not apply mutations.
      for (const check of this.checks) {
        const entry = getEntry(check.key);
        const expected = check.versionstamp;
        const actual = entry ? entry.versionstamp : null;
        if (actual !== expected) {
          return { ok: false };
        }
      }
      // Apply all mutations.
      for (const mutate of this.mutations) {
        mutate(store);
      }
      return { ok: true, versionstamp: store.version.toString().padStart(20, "0") };
    }
  }

  //
  // The Kv API implementation.
  //
  const kv: Kv = {
    async get<T = unknown>(
      key: KvKey,
      options?: { consistency?: KvConsistencyLevel }
    ): Promise<KvEntryMaybe<T>> {
      if (store.closed) throw new Error("KV store is closed");
      const entry = getEntry(key);
      if (entry) {
        return { key: entry.key, value: entry.value as T, versionstamp: entry.versionstamp };
      }
      return { key, value: null, versionstamp: null };
    },

    async getMany<T extends readonly unknown[]>(
      keys: readonly [...{ [K in keyof T]: KvKey }],
      options?: { consistency?: KvConsistencyLevel }
    ): Promise<{ [K in keyof T]: KvEntryMaybe<T[K]> }> {
      const results: any[] = [];
      for (const key of keys) {
        results.push(await this.get(key, options));
      }
      return results as { [K in keyof T]: KvEntryMaybe<T[K]> };
    },

    async set(
      key: KvKey,
      value: unknown,
      options?: { expireIn?: number }
    ): Promise<KvCommitResult> {
      if (store.closed) throw new Error("KV store is closed");
      const versionstamp = nextVersionstamp();
      const expireAt = options?.expireIn ? Date.now() + options.expireIn : undefined;
      const entry: StoreEntry = { key, value, versionstamp, expireAt };
      store.entries.set(serializeKey(key), entry);
      notifyWatchers(entry);
      return { ok: true, versionstamp };
    },

    async delete(key: KvKey): Promise<void> {
      if (store.closed) throw new Error("KV store is closed");
      store.entries.delete(serializeKey(key));
      notifyWatchers({ type: "delete", key });
    },

    list<T = unknown>(selector: KvListSelector, options?: KvListOptions): KvListIterator<T> {
      if (store.closed) throw new Error("KV store is closed");
      return createListIterator<T>(selector, options);
    },

    async enqueue(
      value: unknown,
      options?: { delay?: number; keysIfUndelivered?: KvKey[] }
    ): Promise<KvCommitResult> {
      if (store.closed) throw new Error("KV store is closed");
      // For simplicity, simulate enqueue as a set under a queue namespace.
      const queueKey: KvKey = ["__queue__", Date.now(), Math.random()];
      const versionstamp = nextVersionstamp();
      const entry: StoreEntry = { key: queueKey, value, versionstamp };
      store.entries.set(serializeKey(queueKey), entry);
      notifyWatchers(entry);
      return { ok: true, versionstamp };
    },

    async listenQueue(
      handler: (value: unknown) => Promise<void> | void
    ): Promise<void> {
      if (store.closed) throw new Error("KV store is closed");
      // For demonstration, poll the queue every second.
      const interval = setInterval(async () => {
        for (const entry of Array.from(store.entries.values())) {
          if (entry.key[0] === "__queue__") {
            await handler(entry.value);
            store.entries.delete(serializeKey(entry.key));
            notifyWatchers({ type: "delete", key: entry.key });
          }
        }
      }, 1000);
      // This promise will never resolve unless the store is closed.
      await new Promise<void>(() => { });
      clearInterval(interval);
    },

    atomic(): AtomicOperation {
      if (store.closed) throw new Error("KV store is closed");
      return new InMemoryAtomicOperation();
    },

    watch<T extends readonly unknown[]>(
      keys: readonly [...{ [K in keyof T]: KvKey }],
      options?: { raw?: boolean }
    ): ReadableStream<{ [K in keyof T]: KvEntryMaybe<T[K]> }> {
      if (store.closed) throw new Error("KV store is closed");
      // Create a simple ReadableStream that emits a change event when any watched key is modified.
      return new ReadableStream({
        start(controller) {
          const callback = (event: StoreEntry | { type: "delete"; key: KvKey }) => {
            for (const watchedKey of keys) {
              if (serializeKey((event as { type: "delete"; key: KvKey; }).type === "delete" ? event.key : event.key) === serializeKey(watchedKey)) {
                const entry = getEntry(watchedKey);
                if (entry) {
                  controller.enqueue({
                    [0]: { key: entry.key, value: entry.value, versionstamp: entry.versionstamp },
                  } as any);
                } else {
                  controller.enqueue({
                    [0]: { key: watchedKey, value: null, versionstamp: null },
                  } as any);
                }
              }
            }
          };
          store.watchers.add(callback);
          return () => store.watchers.delete(callback);
        },
      });
    },

    close(): void {
      store.closed = true;
      store.watchers.clear();
      store.entries.clear();
    },

    [Symbol.dispose](): void {
      this.close();
    },
  };

  return kv;
};

export const kv = await openKv();