import { MaybePromise } from ".";

export interface LocalCacheOptions<T> {
  idFn: (data: T) => string;
  ttl?: number | ((data: T) => MaybePromise<number>);
  maxKeys?: number;
  evictionType?: 'OLDEST_USED' | 'CLOSEST_EXPIRY' | 'FIRST';
  checkPeriod?: number;
}

type LocalCacheObject<T> = { [key: string]: { data: T, expireAt?: number, lastUsed?: number } };

export default class LocalCache<T> {

  public cache: LocalCacheObject<T> = {};

  private options: LocalCacheOptions<T>;

  private periodHandle?: NodeJS.Timeout;

  constructor(options: LocalCacheOptions<T>) {
    this.options = options;
  }

  get(id: string) {

    const localCacheEntry = this.cache![id];
    if (!localCacheEntry) return undefined;

    if (localCacheEntry.expireAt && localCacheEntry.expireAt <= Date.now()) {
      this.del(id);
      return undefined;
    }

    localCacheEntry.lastUsed = Date.now();
    return localCacheEntry.data;
  }

  all(): [string, T][] {
    this.cleanup();
    return Object.entries(this.cache).map(([key, { data }]) => ([key, data]));
  }

  async set(data: T): Promise<void>;
  async set(id: string, data: T): Promise<void>;
  async set(data_id: any, _data?: T): Promise<void> {
    const id = typeof data_id == 'string' ? data_id : this.options.idFn(data_id);
    const data = typeof data_id == 'string' ? _data : data_id

    const time = await (typeof this.options.ttl == 'function' ? this.options.ttl(data) : this.options.ttl);
    this.cache[id] = { data, lastUsed: Date.now(), expireAt: time ? Date.now() + time : undefined  };
  
  }

  del(id: string) {
    delete this.cache[id];
  }

  ttl(id: string, ttl?: number) {
    const e = this.cache[id];
    if (ttl) {
      if (!e) return null;
      e.expireAt = Date.now() + ttl;
      return ttl;
    }
    if (!e?.expireAt) return null;
    const now = Date.now();
    if (e.expireAt < now) return null;
    return e.expireAt - now;
  }
  
  public cleanup() {

    const items = Object.entries(this.cache);

    const expired = items.filter(([key, { expireAt }]) => expireAt && expireAt < Date.now());
    expired.forEach(([key]) => {
      delete this.cache[key];
    })

    if (this.options?.maxKeys && this.options?.maxKeys < items.length - expired.length) {

      const items = Object.entries(this.cache);
      const evictionCount = items.length - this.options.maxKeys;

      switch (this.options.evictionType) {
        case 'FIRST': {
          const evictionEntries = items.slice(0, evictionCount);
          evictionEntries.forEach(([key]) => {
            delete this.cache[key];
          })
          break;
        }
        case 'OLDEST_USED': {
          const evictionEntires = items
          .sort((a, b) => (a[1].lastUsed || Infinity) - (b[1].lastUsed || Infinity))
          .slice(0, evictionCount);

          evictionEntires.forEach(([key]) => {
            delete this.cache[key];
          })
          break;
        }
        case 'CLOSEST_EXPIRY':
        default: {
          const evictionEntries = items
            .sort((a, b) => (a[1].expireAt || Infinity) - (b[1].expireAt || Infinity))
            .slice(0, evictionCount);
          evictionEntries.forEach(([key]) => {
            delete this.cache[key];
          })
          break;
        }
      }
    }
  }

  restore(cache: LocalCacheObject<T>) {
    this.cache = cache;
    this.cleanup();
  }

  startIntervalCheck() {
    this.stopIntervalCheck();
    this.periodHandle = setInterval(this.cleanup, this.options.checkPeriod);
  }

  stopIntervalCheck() {
    if (!this.periodHandle) return;
    clearInterval(this.periodHandle);
  }

  flush() {
    this.cache = {};
  }

  close() {
    this.stopIntervalCheck();
  }
}