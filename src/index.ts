import { Redis } from 'ioredis';

type MaybePromise<T> = T | Promise<T>;

export type LocalCache<T> = { [id: string]: { data: T, expireAt?: number, lastUsed?: number } };

export interface RedisCacheSetOptions {
  expiryMode?: 'EX' | 'PX' | 'EXAT' | 'PXAT' | 'NX' | 'XX';
  time?: string | number;
}

export interface RedisCacheLocalCacheOptions {
  expiryMode?: 'EX' | 'PX';
  expireTime?: number;
  maxKeys?: number;
  checkPeriod?: number;
  evictionType?: 'OLDEST_USED' | 'CLOSEST_EXPIRY' | 'FIRST';
}

export interface RedisCacheOptions<T> {
  client: Redis;
  prefix?: string;
  typename: string;
  idFn?: (data: T) => string;
  dataFn: (id: string) => MaybePromise<T>;
  setOptions?: RedisCacheSetOptions;
  localCacheOptions?: boolean | RedisCacheLocalCacheOptions;
}

class RedisCache<T = ({ id: string })> {

  private client: Redis;
  private baseKey: string;
  private idFn: (data: T) => string;
  private dataFn: (id: string) => MaybePromise<T>;
  private setOptions?: RedisCacheSetOptions;

  private localCacheOptions?: RedisCacheLocalCacheOptions;
  private localCache?: LocalCache<T>;
  
  private periodHandle?: NodeJS.Timeout;

  constructor(options: RedisCacheOptions<T>) {
    this.client = options.client;
    this.baseKey = `${options.prefix ?? 'cache'}:${options.typename}:`;
    this.idFn = options.idFn || ((data: any) => data.id);
    this.dataFn = options.dataFn;
    this.setOptions = options.setOptions;
    this.localCacheOptions = (options.localCacheOptions && (typeof options.localCacheOptions != 'object' ? {} : options.localCacheOptions)) || undefined;
    
    if (this.localCacheOptions) this.localCache = {};
    if (this.localCacheOptions?.checkPeriod) {
      this.periodHandle = setInterval(this.cleanLocalCache, this.localCacheOptions.checkPeriod);
    }
  }


  public async refetch(id: string) {
    const data = await this.dataFn(id);
    if (data !== undefined) await this.set(id, data);
    return data;
  }
  
  public async get(id: string, forceRefetch?: boolean): Promise<T> {

    if (!forceRefetch) {

      const local = this.getLocal(id);
      if (local !== undefined) return local;
      
      const key = this.defineKey(id);
      const json = await this.client.get(key);
      
      if (json != null) {
        const data = JSON.parse(json);
        this.setLocal(id, data);
        return data;
      }
    }

    return this.refetch(id);
  }


  private getLocal(id: string): T | undefined {
    
    if (!this.localCacheEnabled()) return undefined;
    
    const localCacheEntry = this.localCache![id];
    if (!localCacheEntry) return undefined;

    if (localCacheEntry.expireAt && localCacheEntry.expireAt <= Date.now()) {
      this.deleteLocal(id);
      return undefined;
    }

    localCacheEntry.lastUsed = Date.now();
    return localCacheEntry.data;
  }

  public async set(data: T): Promise<void>;
  public async set(id: string, data: T): Promise<void>;
  public async set(idOrData: any, overloadData?: T): Promise<void> {

    const id = typeof idOrData == 'string' ? idOrData : this.idFn(idOrData);
    const data = typeof idOrData == 'string' ?  overloadData : idOrData;

    const json = JSON.stringify(data);
    const key = this.defineKey(id);

    if (this.setOptions?.expiryMode && this.setOptions?.time) {
      await this.client.set(key, json, this.setOptions?.expiryMode, this.setOptions?.time);
    } else {
      await this.client.set(key, json);
    }

    this.setLocal(id, data);
  }
  
  private setLocal(id: string, data: T) {
    if (!this.localCacheEnabled()) return;
    this.localCache![id] = { data, lastUsed: Date.now(), expireAt: this.getLocalExpireTime()  };
  }

  public async delete(id: string) {
    const key = this.defineKey(id);
    await this.client.del(key);
    this.deleteLocal(id);
  }

  private deleteLocal(id: string) {
    if (!this.localCacheEnabled()) return;
    delete this.localCache![id];
  }



  private getLocalExpireTime() {
    switch(this.localCacheOptions?.expiryMode) {
      case 'EX':
        return Date.now() + this.localCacheOptions.expireTime! * 1000;
      case 'PX':
        return Date.now() + this.localCacheOptions.expireTime!;
      default:
        return undefined;
    }
  }

  

  public defineKey(data: T): string;
  public defineKey(id: string): string;
  public defineKey(data: any) {

    const getKeyById = (id: string) => {
      return this.baseKey + id;
    }

    if (typeof data == 'string') {
      return getKeyById(data);
    }

    const id = this.idFn(data);
    return getKeyById(id);
  }

  public localCacheEnabled() {
    return Boolean(this.localCacheOptions && this.localCache);
  }

  public cleanLocalCache() {

    if (!this.localCacheEnabled()) return;

    const items = Object.entries(this.localCache!);

    const expired = items.filter(([key, { expireAt }]) => expireAt && expireAt < Date.now());
    expired.forEach(([key]) => {
      delete this.localCache![key];
    })

    if (this.localCacheOptions?.maxKeys && this.localCacheOptions?.maxKeys < items.length - expired.length) {

      const items = Object.entries(this.localCache!);
      const evictionCount = items.length - this.localCacheOptions.maxKeys;

      switch (this.localCacheOptions.evictionType) {
        case 'FIRST': {
          const evictionEntries = items.slice(0, evictionCount);
          evictionEntries.forEach(([key]) => {
            delete this.localCache![key];
          })
          break;
        }
        case 'OLDEST_USED': {
          const evictionEntires = items
          .sort((a, b) => (a[1].lastUsed || Infinity) - (b[1].lastUsed || Infinity))
          .slice(0, evictionCount);

          evictionEntires.forEach(([key]) => {
            delete this.localCache![key];
          })
          break;
        }
        case 'CLOSEST_EXPIRY':
        default: {
          const evictionEntries = items
            .sort((a, b) => (a[1].expireAt || Infinity) - (b[1].expireAt || Infinity))
            .slice(0, evictionCount);
          console.log(this.localCacheOptions.evictionType, evictionEntries);
          evictionEntries.forEach(([key]) => {
            delete this.localCache![key];
          })
          break;
        }
      }
    }
  }

  public getLocalCache() {
    return this.localCache;
  }

  public restoreLocalCache(cache: LocalCache<T>) {
    this.localCache = cache;
  }

  public async clear() {
    const keys = await this.scanAll(`${this.baseKey}*`);
    if (keys.length == 0) return;
    await this.client.del(keys);
  }

  async scanAll (pattern: string) {
    const found: string[] = [];
    let cursor = '0';
  
    do {
      const reply = await this.client.scan(cursor, 'MATCH', pattern);
  
      cursor = reply[0];
      found.push(...reply[1]);
    } while (cursor !== '0');
  
    return found;
  }

  async close(quitRedisClient?: boolean) {
    if (quitRedisClient) this.client.quit();
    if (this.periodHandle) clearInterval(this.periodHandle);
  }

}

export default RedisCache;