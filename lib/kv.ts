// eslint-disable-file no-explicit-any
// eslint-disable-file no-unused-vars
// filename: kv.ts
// A Redis-backed implementation of Deno KV based on unstorage
// This implementation uses Redis as the storage layer via unstorage
// With Azure Managed Identity support

(Symbol as any).dispose ??= Symbol("Symbol.dispose");
 
import type { TokenCredential, AccessToken } from "@azure/identity";
import type { Cluster } from "ioredis";

import type { Storage } from "unstorage";
import type { RedisOptions } from "unstorage/drivers/redis";

import { DefaultAzureCredential } from "@azure/identity";
import { decodeJwt } from "jose";
import Redis from "ioredis";

import { createStorage } from "unstorage";
import redisDriver from "unstorage/drivers/redis";
import lruCacheDriver from "unstorage/drivers/lru-cache";

import process from "node:process";

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
  ): Promise<KvListIterator<T>>;
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
// Helper functions for Redis storage
//

// Serialize a key array into a string (for storage indexing)
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

// Structure for storing entries in Redis
interface StoreEntry {
  key: KvKey;
  value: unknown;
  versionstamp: string;
  expireAt?: number; // in ms
}

// Meta key for storing version counter
const META_VERSION_KEY = "__meta__version";
// Prefix for queue entries
const QUEUE_PREFIX = "__queue__";


// --------------------------
// Helper Functions & Types
// --------------------------


/**
 * Decodes a base64-encoded string.
 *
 * @see {@link https://www.rfc-editor.org/rfc/rfc4648.html#section-4}
 *
 * @param b64 The base64-encoded string to decode.
 * @returns The decoded data.
 *
 * @example Usage
 * ```ts
 * import { decodeBase64 } from "@std/encoding/base64";
 * import { assertEquals } from "@std/assert";
 *
 * assertEquals(
 *   decodeBase64("Zm9vYmFy"),
 *   new TextEncoder().encode("foobar")
 * );
 * ```
 */
export function decodeBase64(b64: string): Uint8Array {
  const binString = atob(b64);
  const size = binString.length;
  const bytes = new Uint8Array(size);
  for (let i = 0; i < size; i++) {
    bytes[i] = binString.charCodeAt(i);
  }
  return bytes;
}

/**
 * Acquires an Azure access token for Redis.
 */
async function getRedisToken(
  credential: TokenCredential
): Promise<AccessToken | null> {
  const redisScope = "https://redis.azure.com/.default";
  return await credential.getToken(redisScope);
}

/**
 * Extracts a username from the JWT access token.
 */
function extractCredentialInfo(accessToken: AccessToken) {
  const { oid } = decodeJwt(accessToken?.token);
  return {
    username: oid as string,
    password: accessToken?.token
  };
}

/**
 * Returns a random integer between min and max, inclusive.
 */
function randomNumber(min: number, max: number): number {
  min = Math.ceil(min);
  max = Math.floor(max);
  return Math.floor(Math.random() * (max - min + 1)) + min;
}

/**
 * Builds the Redis driver options based on the configuration and
 * whether Entra Identity is enabled, plus whether cluster mode should be used.
 *
 * When cluster mode is enabled (via the useCluster flag or the REDIS_CLUSTER_ENABLED env var),
 * the host and port options are automatically translated into a cluster configuration,
 * and the login credentials are provided within clusterOptions.redisOptions.
 */
function getDriverOptions(
  redisConfig: RedisOptions,
  accessToken?: AccessToken,
  useEntraIdentity: boolean = process.env.REDIS_ENTRA_IDENTITY?.trim()?.toLowerCase() === "true",
  useCluster: boolean = process.env.REDIS_CLUSTER_ENABLED?.trim()?.toLowerCase() === "true"
): RedisOptions {
  // Extract credentials from the token if available.
  const _username = redisConfig?.username || process.env.REDIS_USER;
  const _password = redisConfig?.password || process.env.REDIS_PASSWORD;
  const creds = useEntraIdentity ? extractCredentialInfo(accessToken!) : {
    username: _username,
    password: _password
  };

  // Common options shared between single-instance and cluster modes.
  const commonBaseOptions: RedisOptions = {
    base: redisConfig?.base || process.env.REDIS_BASE || "unstorage",
    lazyConnect: redisConfig?.lazyConnect ?? true,
    enableOfflineQueue: true,
  };

  const commonSharedOptions: RedisOptions = {
    showFriendlyErrorStack: true,
    connectTimeout: 20000,
    enableReadyCheck: true,
    maxRetriesPerRequest: 3,
    enableAutoPipelining: true,
    autoPipeliningIgnoredCommands: ['ping'],
  }

  if (useCluster) {
    return {
      ...commonBaseOptions,
      // Wrap the host/port into a cluster node.
      cluster: [
        {
          host: redisConfig?.host || process.env.REDIS_HOST || "localhost",
          port:
            redisConfig?.port ||
            (process.env.REDIS_PORT ? Number(process.env.REDIS_PORT) : 6379),
        },
      ],
      // Embed the login credentials into clusterOptions.redisOptions.
      clusterOptions: {
        ...redisConfig.clusterOptions,
        ...commonSharedOptions,
        redisOptions: {
          ...(redisConfig.clusterOptions?.redisOptions || {}),
          tls: (process.env.REDIS_TLS?.trim()?.toLowerCase() === "true") as any,
          username: creds?.username,
          password: creds?.password,
        },
      },
    } as RedisOptions;
  }

  // Single-instance configuration remains unchanged.
  return {
    ...commonBaseOptions,
    ...commonSharedOptions,
    host: redisConfig?.host || process.env.REDIS_HOST || "localhost",
    port:
      redisConfig?.port ||
      (process.env.REDIS_PORT ? Number(process.env.REDIS_PORT) : 6379),
    tls: (process.env.REDIS_TLS?.trim()?.toLowerCase() === "true") as any,
    username: creds?.username,
    password: creds?.password,
  } as RedisOptions;
}

/**
 * Sets up periodic token refresh on the given Redis client.
 */
async function setupTokenRefresh(
  redisClient: Redis | Cluster,
  credential: TokenCredential,
  refreshIntervalMs: number
) {
  const jitteredRefreshTime = randomNumber(
    refreshIntervalMs * 0.5,
    refreshIntervalMs * 0.8
  );
  const refreshTimer = setInterval(async () => {
    try {
      const newToken = await getRedisToken(credential);
      if (!newToken) {
        throw new Error("Could not obtain new Azure access token.");
      }
      const creds = extractCredentialInfo(newToken!);
      await redisClient.auth(
        creds.username,
        creds.password
      );
    } catch (error) {
      console.error("Error refreshing Redis token:", error);
    }
  }, jitteredRefreshTime);

  redisClient.on("close", () => clearInterval(refreshTimer));
}

// --------------------------
// Main Initialization Logic
// --------------------------

export async function initializeStorage(
  redisConfig?: {
    host?: string;
    port?: string | number;
    base?: string;
    useEntraIdentity?: boolean;
    useCluster?: boolean;
    tokenRefreshIntervalMs?: number;
    password?: string;
  }
) {
  try {
    const useEntraIdentity =
      redisConfig?.useEntraIdentity ||
      process.env.REDIS_ENTRA_IDENTITY?.trim()?.toLowerCase() === "true";

    const useCluster =
      redisConfig?.useCluster ||
      process.env.REDIS_CLUSTER_ENABLED?.trim()?.toLowerCase() === "true";

    let credential: DefaultAzureCredential | null = null;
    let accessToken: AccessToken | null = null;

    if (useEntraIdentity) {
      try {
        // Try to obtain an Azure access token via managed identity
        credential = new DefaultAzureCredential();
        accessToken = await getRedisToken(credential);
        if (!accessToken) {
          throw new Error("Could not obtain initial Azure access token.");
        }
      } catch (error) {
        console.error("Azure managed identity login failed, falling back to in-memory storage:", error);
        // Fallback: remove the host so that the in-memory unstorage driver is used
        if (redisConfig) {
          redisConfig.host = undefined;
        } else {
          redisConfig = { host: undefined };
        }
      }
    }

    const driverOptions = getDriverOptions(
      (redisConfig as RedisOptions) || {},
      accessToken || undefined,
      useEntraIdentity,
      useCluster,
    );

    const _host = redisConfig?.host ?? process.env.REDIS_HOST; 

    // Create the driver: use Redis driver if a host is provided; otherwise, fallback to in-memory driver.
    const driver = _host ? redisDriver(driverOptions) : lruCacheDriver({});

    // Create the unstorage storage instance.
    const storage = createStorage({ driver });

    // If using Managed Identity and a host is provided, attach token refresh logic.
    if (useEntraIdentity && credential && _host) {
      const redisClient = driver.getInstance!() as Redis | Cluster;
      const refreshInterval = redisConfig?.tokenRefreshIntervalMs || (
        accessToken?.expiresOnTimestamp ?
          (accessToken!.expiresOnTimestamp - Date.now()) :
          240_000  // default 4 minutes
      );
      await setupTokenRefresh(redisClient, credential, refreshInterval);
    }

    return storage;
  } catch (e) {
    console.log({
      error: e,
      message: "Error initializing Redis driver",
    })
    return createStorage({ driver: lruCacheDriver({}) });
  }
}

//
// openKv: Creates the Redis-backed store and returns a Kv object with full API methods
//

export const openKv = async (
  redisConfig?: {
    host?: string;
    port?: string | number;
    password?: string;
    tls?: boolean;
    base?: string;
    useEntraIdentity?: boolean;
    tokenRefreshIntervalMs?: number;
    lazyConnect?: boolean
  }
): Promise<Kv> => {
  // Create storage with the standard Redis driver
  let _storage: Storage | undefined;

  async function getStorage(): Promise<Storage> {
    if (_storage) return _storage;

    _storage = await initializeStorage(redisConfig)

    // Initialize version counter if not exists
    const currentVersion = await _storage.getItem<number>(META_VERSION_KEY) || 0;
    if (!currentVersion) {
      await _storage.setItem(META_VERSION_KEY, 0);
    }

    return _storage;
  }

  // Set of watchers for change events
  const watchers = new Set<(event: StoreEntry | { type: "delete"; key: KvKey }) => void>();
  let closed = false;

  // Utility to produce a new versionstamp (simple increment)
  const nextVersionstamp = async (): Promise<string> => {
    const storage = await getStorage();
    const version = (await storage.getItem<number>(META_VERSION_KEY) || 0) + 1;
    await storage.setItem(META_VERSION_KEY, version);
    return version.toString().padStart(20, "0");
  };

  // Helper: Get an entry (if present and not expired)
  const getEntry = async (key: KvKey): Promise<StoreEntry | null | undefined> => {
    const serialized = serializeKey(key);

    const storage = await getStorage();
    const entry = await storage.getItem<StoreEntry>(serialized);
    if (entry && entry.expireAt && Date.now() > entry.expireAt) {
      // Remove expired entry
      await storage.removeItem(serialized);
      return undefined;
    }
    return entry;
  };

  // Notify any watchers about a change
  const notifyWatchers = (
    event: StoreEntry | { type: "delete"; key: KvKey }
  ) => {
    for (const watcher of watchers) {
      watcher(event);
    }
  };

  // Implementation of list as an async generator
  async function createListIterator<T>(
    selector: KvListSelector,
    options?: KvListOptions
  ): Promise<KvListIterator<T>> {
    // Get all keys with their values
    const storage = await getStorage();
    const keys = await storage.getKeys();

    // Filter out meta keys and queue keys
    const dataKeys = keys.filter(k =>
      !k.startsWith(META_VERSION_KEY) &&
      !k.startsWith(QUEUE_PREFIX));

    // Get all entries
    const entriesPromises = dataKeys.map(async k => {
      const entry = await storage.getItem<StoreEntry>(k);
      return entry;
    });

    let allEntries = (await Promise.all(entriesPromises)).filter(Boolean) as StoreEntry[];

    // Filter expired entries
    allEntries = allEntries.filter(entry => {
      if (entry?.expireAt && Date.now() > entry.expireAt) {
        // Mark for removal but don't wait
        storage.removeItem(serializeKey(entry.key));
        return false;
      }
      return true;
    });

    // Sort entries by key
    allEntries.sort((a, b) => compareKeys(a.key, b.key));

    // Apply filtering based on selector
    let results: StoreEntry[] = [];
    if ("prefix" in selector) {
      results = allEntries.filter((entry) =>
        keyMatchesPrefix(entry.key, selector.prefix)
      );
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
      );
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
          const entry = results[index];
          _cursor = serializeKey(entry.key);
          index++;
          return { value: entry as KvEntry<T>, done: false };
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

  // A Redis-backed atomic operation implementation
  class RedisAtomicOperation implements AtomicOperation {
    private checks: AtomicCheck[] = [];
    private mutations: ((s: Storage) => Promise<void>)[] = [];

    check(...checks: AtomicCheck[]): this {
      this.checks.push(...checks);
      return this;
    }

    sum(key: KvKey, n: bigint): this {
      this.mutations.push(async (s: Storage) => {
        const entry = await getEntry(key);
        let current = BigInt(0);
        if (entry && typeof entry.value === "bigint") {
          current = entry.value as bigint;
        }
        const newVal = current + n;
        const versionstamp = await nextVersionstamp();
        await s.setItem(serializeKey(key), {
          key,
          value: newVal,
          versionstamp
        });
        notifyWatchers({ key, value: newVal, versionstamp });
      });
      return this;
    }

    min(key: KvKey, n: bigint): this {
      this.mutations.push(async (s: Storage) => {
        const entry = await getEntry(key);
        let current = n;
        if (entry && typeof entry.value === "bigint") {
          current = (entry.value as bigint) < n ? (entry.value as bigint) : n;
        }
        const versionstamp = await nextVersionstamp();
        await s.setItem(serializeKey(key), {
          key,
          value: current,
          versionstamp
        });
        notifyWatchers({ key, value: current, versionstamp });
      });
      return this;
    }

    max(key: KvKey, n: bigint): this {
      this.mutations.push(async (s: Storage) => {
        const entry = await getEntry(key);
        let current = n;
        if (entry && typeof entry.value === "bigint") {
          current = (entry.value as bigint) > n ? (entry.value as bigint) : n;
        }
        const versionstamp = await nextVersionstamp();
        await s.setItem(serializeKey(key), {
          key,
          value: current,
          versionstamp
        });
        notifyWatchers({ key, value: current, versionstamp });
      });
      return this;
    }

    set(key: KvKey, value: unknown, options?: { expireIn?: number }): this {
      this.mutations.push(async (s: Storage) => {
        const versionstamp = await nextVersionstamp();
        const expireAt = options?.expireIn ? Date.now() + options.expireIn : undefined;
        const entry: StoreEntry = { key, value, versionstamp, expireAt };
        await s.setItem(serializeKey(key), entry);

        // If expiration is set, also set TTL on Redis key
        if (expireAt) {
          // The actual TTL will be handled at the Redis driver level
          // by setting the Redis key expiration
          await s.setItemRaw(serializeKey(key), JSON.stringify(entry), {
            ttl: Math.ceil(options?.expireIn! / 1000)
          });
        }

        notifyWatchers(entry);
      });
      return this;
    }

    delete(key: KvKey): this {
      this.mutations.push(async (s: Storage) => {
        await s.removeItem(serializeKey(key));
        notifyWatchers({ type: "delete", key });
      });
      return this;
    }

    enqueue(
      value: unknown,
      options?: { delay?: number; keysIfUndelivered?: KvKey[] }
    ): this {
      // Simulate enqueue as a set under a special queue key
      const queueKey: KvKey = [QUEUE_PREFIX, Date.now(), Math.random()];
      this.mutations.push(async (s: Storage) => {
        const versionstamp = await nextVersionstamp();
        const entry: StoreEntry = {
          key: queueKey,
          value,
          versionstamp
        };

        // If delay is specified, use Redis TTL
        if (options?.delay) {
          // Store with TTL - the key will appear after the delay
          await s.setItemRaw(serializeKey(queueKey), JSON.stringify(entry), {
            ttl: Math.ceil(options.delay / 1000)
          });
        } else {
          await s.setItem(serializeKey(queueKey), entry);
        }

        notifyWatchers(entry);
      });
      return this;
    }

    async commit(): Promise<KvCommitResult | { ok: false }> {
      // First verify all checks before applying mutations
      for (const check of this.checks) {
        const entry = await getEntry(check.key);
        const expected = check.versionstamp;
        const actual = entry ? entry.versionstamp : null;
        if (actual !== expected) {
          return { ok: false };
        }
      }

      // Apply all mutations
      const storage = await getStorage();
      for (const mutate of this.mutations) {
        await mutate(storage);
      }

      const finalVersionstamp = await storage.getItem<number>(META_VERSION_KEY);
      return {
        ok: true,
        versionstamp: finalVersionstamp!.toString().padStart(20, "0")
      };
    }
  }

  //
  // The Kv API implementation
  //
  const kv: Kv = {
    async get<T = unknown>(
      key: KvKey,
      options?: { consistency?: KvConsistencyLevel }
    ): Promise<KvEntryMaybe<T>> {
      if (closed) throw new Error("KV store is closed");
      const entry = await getEntry(key);

      if (entry) {
        return {
          key: entry.key,
          value: entry.value as T,
          versionstamp: entry.versionstamp
        };
      }
      return { key, value: null, versionstamp: null };
    },

    async getMany<T extends readonly unknown[]>(
      keys: readonly [...{ [K in keyof T]: KvKey }],
      options?: { consistency?: KvConsistencyLevel }
    ): Promise<{ [K in keyof T]: KvEntryMaybe<T[K]> }> {
      if (closed) throw new Error("KV store is closed");
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
      if (closed) throw new Error("KV store is closed");
      const versionstamp = await nextVersionstamp();
      const expireAt = options?.expireIn ? Date.now() + options.expireIn : undefined;
      const entry: StoreEntry = { key, value, versionstamp, expireAt };

      const storage = await getStorage();
      if (options?.expireIn) {
        // Using Redis TTL for expiration
        await storage.setItemRaw(serializeKey(key), JSON.stringify(entry), {
          ttl: Math.ceil(options.expireIn / 1000)
        });
      } else {
        await storage.setItem(serializeKey(key), entry);
      }

      notifyWatchers(entry);
      return { ok: true, versionstamp };
    },

    async delete(key: KvKey): Promise<void> {
      if (closed) throw new Error("KV store is closed");
      const storage = await getStorage();
      await storage.removeItem(serializeKey(key));
      notifyWatchers({ type: "delete", key });
    },

    list<T = unknown>(
      selector: KvListSelector,
      options?: KvListOptions
    ): Promise<KvListIterator<T>> {
      if (closed) throw new Error("KV store is closed");
      return createListIterator<T>(selector, options);
    },

    async enqueue(
      value: unknown,
      options?: { delay?: number; keysIfUndelivered?: KvKey[] }
    ): Promise<KvCommitResult> {
      if (closed) throw new Error("KV store is closed");
      // Simulate enqueue as a set under a queue namespace
      const queueKey: KvKey = [QUEUE_PREFIX, Date.now(), Math.random()];
      const versionstamp = await nextVersionstamp();
      const entry: StoreEntry = { key: queueKey, value, versionstamp };

      const storage = await getStorage();
      if (options?.delay) {
        // Using Redis TTL for delay
        await storage.setItemRaw(serializeKey(queueKey), JSON.stringify(entry), {
          ttl: Math.ceil(options.delay / 1000)
        });
      } else {
        await storage.setItem(serializeKey(queueKey), entry);
      }

      notifyWatchers(entry);
      return { ok: true, versionstamp };
    },

    async listenQueue(
      handler: (value: unknown) => Promise<void> | void
    ): Promise<void> {
      if (closed) throw new Error("KV store is closed");

      // For demonstration, poll the queue every second
      const interval = setInterval(async () => {
        const storage = await getStorage();
        const keys = await storage.getKeys();
        const queueKeys = keys.filter(k => k.startsWith(QUEUE_PREFIX));

        for (const key of queueKeys) {
          const entry = await storage.getItem<StoreEntry>(key);
          if (entry) {
            await handler(entry.value);
            await storage.removeItem(key);
            notifyWatchers({ type: "delete", key: entry.key });
          }
        }
      }, 1000);

      // This promise will never resolve unless the store is closed
      await new Promise<void>(() => { });
      clearInterval(interval);
    },

    atomic(): AtomicOperation {
      if (closed) throw new Error("KV store is closed");
      return new RedisAtomicOperation();
    },

    watch<T extends readonly unknown[]>(
      keys: readonly [...{ [K in keyof T]: KvKey }],
      options?: { raw?: boolean }
    ): ReadableStream<{ [K in keyof T]: KvEntryMaybe<T[K]> }> {
      if (closed) throw new Error("KV store is closed");

      // Create a ReadableStream that emits a change event when any watched key is modified
      return new ReadableStream({
        start(controller) {
          const callback = async (event: StoreEntry | { type: "delete"; key: KvKey }) => {
            for (const watchedKey of keys) {
              const eventKey = (event as any).type === "delete"
                ? (event as { type: "delete"; key: KvKey }).key
                : (event as StoreEntry).key;

              if (serializeKey(eventKey) === serializeKey(watchedKey)) {
                const entry = await getEntry(watchedKey);
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

          watchers.add(callback);
          return () => watchers.delete(callback);
        },
      });
    },

    close(): void {
      closed = true;
      watchers.clear();
    },

    [Symbol.dispose](): void {
      this.close();
    },
  };

  return kv;
};

// Export a default instance with the provided Redis configuration
export const kv = await openKv({
  tokenRefreshIntervalMs: process.env.REDIS_TOKEN_REFRESH_INTERVAL
    ? parseInt(process.env.REDIS_TOKEN_REFRESH_INTERVAL)
    : 240_000
});