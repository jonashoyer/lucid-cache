import LocalCache, { LocalCacheOptions } from './localCache';
import RedisCache, { RedisCacheOptions } from './redisCache';

export type MaybePromise<T> = T | Promise<T>;
export type DefaultCacheObject = { id: string, [key: string]: any };

// redis-cache -> better-cache

export interface CacheOptions<T> {
  idFn: (data: T) => string;
  dataFn: (id: string) => MaybePromise<T>;
  redisCache?: Omit<RedisCacheOptions<T>, 'idFn'>;
  localCache?: Omit<LocalCacheOptions<T>, 'idFn'>;
}

class Cache<T = DefaultCacheObject> {

  idFn: (data: T) => string;
  dataFn: (id: string) => MaybePromise<T>; 

  redisCache?: RedisCache<T>;
  localCache?: LocalCache<T>;

  constructor(options: CacheOptions<T>) {

    this.idFn = options.idFn;
    this.dataFn = options.dataFn;

    if (options.redisCache) this.redisCache = new RedisCache({ ...options.redisCache, idFn: options.idFn })
    if (options.localCache) this.localCache = new LocalCache({ ...options.localCache, idFn: options.idFn })
  }


  public async refetch(id: string) {
    const data = await this.dataFn(id);
    if (data !== undefined) await this.set(id, data);
    return data;
  }
  
  public async get(id: string, forceRefetch?: boolean): Promise<T> {

    if (forceRefetch) return this.refetch(id);

    if (this.localCache) {
      const localData = await this.localCache.get(id);
      if (localData) return localData;
    }

    if (this.redisCache) {
      const redisData = await this.redisCache.get(id);
      if (redisData) {
        if (this.localCache) this.localCache.set(id, redisData);
        return redisData;
      }
    }

    return this.refetch(id);
  }


  public async set(data: T): Promise<void>;
  public async set(id: string, data: T): Promise<void>;
  public async set(idOrData: any, overloadData?: T): Promise<void> {

    const id = typeof idOrData == 'string' ? idOrData : this.idFn(idOrData);
    const data = typeof idOrData == 'string' ?  overloadData : idOrData;

    if (this.localCache) await this.localCache.set(id, data);
    if (this.redisCache) await this.redisCache.set(id, data);
  }
  
  public async del(id: string) {
    if (this.localCache) await this.localCache.del(id);
    if (this.redisCache) await this.redisCache.del(id);
  }

  public async flush() {
    if (this.localCache) await this.localCache.flush();
    if (this.redisCache) await this.redisCache.flush();
  }

  async close(closeConnection?: boolean) {
    if (this.localCache) this.localCache.close();
    if (this.redisCache) this.redisCache.close(closeConnection);
  }

}

export default Cache;