import { Redis } from 'ioredis';

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
  dataFn: (id: string) => Promise<T>;
  setOptions?: RedisCacheSetOptions;
  localCacheOptions?: RedisCacheLocalCacheOptions;
}

export class RedisCache<T = ({ id: string })> {

  private client: Redis;
  private baseKey: string;
  private idFn: (data: T) => string;
  private dataFn: (id: string) => Promise<T>;
  private setOptions?: RedisCacheSetOptions;

  private localCacheOptions?: RedisCacheLocalCacheOptions;
  private localCache?: { [id: string]: { data: T, expireAt?: number, lastUsed?: number } };
  

  constructor(options: RedisCacheOptions<T>) {
    this.client = options.client;
    this.baseKey = `${options.prefix ?? 'cache'}:${options.typename}:`;
    this.idFn = options.idFn || ((data: any) => data.id);
    this.dataFn = options.dataFn;
    this.setOptions = options.setOptions;
    this.localCacheOptions = options.localCacheOptions;
    
    if (this.localCacheOptions) this.localCache = {};
    if (this.localCacheOptions?.checkPeriod) {
      setInterval(this.cleanLocalCache, this.localCacheOptions.checkPeriod);
    }
  }


  public async refetch(id: string) {
    const data = await this.dataFn(id);
    if (data !== undefined) await this.set(id, data);
  }
  
  public async get(id: string) {

    const local = this.getLocal(id);
    if (local !== undefined) return local;
    
    const key = this.defineKey(id);
    const json = await this.client.get(key);

    if (json != null) {
      return JSON.parse(json);
    }

    const data = await this.dataFn(id);
    if (data !== undefined) await this.set(id, data);
    return data;
  }


  private getLocal(id: string) {
    
    if (!this.localCacheEnabled()) return undefined;
    
    const localCacheEntry = this.localCache![id];
    if (localCacheEntry.expireAt && Date.now() < localCacheEntry.expireAt) {
      this.deleteLocal(id);
      return undefined;
    }

    localCacheEntry.lastUsed = Date.now();
    return localCacheEntry.data;
  }

  public async set(id: string, data: T) {

    const json = JSON.stringify(data);
    const key = this.defineKey(id);
    await this.client.set(key, json, this.setOptions?.expiryMode, this.setOptions?.time);

    this.setLocal(id, data);
  }
  
  private setLocal(id: string, data: T) {
    if (!this.localCacheEnabled()) return;

    this.localCache![id] = { data, lastUsed: Date.now(), expireAt: this.getLocalExpireTime()  };
  }

  public async delete(id: string) {

    await this.client.del(id);
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
          const evictionKeys = items.slice(0, evictionCount);
          evictionKeys.forEach(([key]) => {
            delete this.localCache![key];
          })
        }
        case 'OLDEST_USED': {
          const evictionKeys = items
            .sort((a, b) => (a[1].lastUsed || Infinity) - (b[1].lastUsed || Infinity))
            .slice(0, evictionCount);
          evictionKeys.forEach(([key]) => {
            delete this.localCache![key];
          })
        }
        case 'CLOSEST_EXPIRY':
        default: {
          const evictionKeys = items
            .sort((a, b) => (a[1].expireAt || Infinity) - (b[1].expireAt || Infinity))
            .slice(0, evictionCount);
          evictionKeys.forEach(([key]) => {
            delete this.localCache![key];
          })
        }
      }
    }
  }
}