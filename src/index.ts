import LocalCache, { LocalCacheOptions } from './localCache';
import RedisCache, { RedisCacheOptions } from './redisCache';
import PersistentStorage, { PersistentStorageOptions } from './persistentStorage';

export type MaybePromise<T> = T | Promise<T>;
export type DefaultCacheObject = { id: string, [key: string]: any };

export type CacheRedisOptions<T> = Omit<RedisCacheOptions<T>, 'idFn'>;
export type CacheLocalOptions<T> = Omit<LocalCacheOptions<T>, 'idFn'>;
export type CachePersistentOptions<T> = Omit<PersistentStorageOptions<T>, 'idFn'>;

export interface CacheOptions<T> {
  idFn: (data: T) => string;
  redisCache?: CacheRedisOptions<T>;
  localCache?: CacheLocalOptions<T>;
  persistentStorage?: CachePersistentOptions<T>;
}

class Cache<T = DefaultCacheObject> {

  idFn: (data: T) => string;

  redisCache?: RedisCache<T>;
  localCache?: LocalCache<T>;
  persistentStorage?: PersistentStorage<T>;

  constructor(options: CacheOptions<T>) {

    const { idFn, redisCache, localCache, persistentStorage } = options;
    this.idFn = idFn;
    
    if (redisCache) this.redisCache = new RedisCache({ ...redisCache, idFn });
    if (localCache) this.localCache = new LocalCache({ ...localCache, idFn });
    if (persistentStorage) this.persistentStorage = new PersistentStorage({ ...persistentStorage, idFn });
  }


  public async refetch(id: string) {
    if (!this.persistentStorage) throw new Error("Can't refetch without persistent storage!");
    if (!this.persistentStorage?.get) throw new Error("Can't refetch without persistent storage 'getFn'!");
    const data = await this.persistentStorage.get(id);
    if (data !== undefined) await this.set(id, data);
    return data;
  }
  
  public async get(id: string, forceRefetch?: boolean): Promise<T | undefined> {

    if (forceRefetch) return this.refetch(id);

    if (this.localCache) {
      const localData = this.localCache.get(id);
      if (localData) return localData;
    }

    if (this.redisCache) {
      const redisData = await this.redisCache.get(id);
      if (redisData) {
        if (this.localCache) this.localCache.set(id, redisData);
        return redisData;
      }
    }

    if (!this.persistentStorage?.get) {
      return undefined;
    }

    return this.refetch(id);
  }


  public async set(data: T, persistent?: boolean): Promise<void>;
  public async set(id: string, data: T, persistent?: boolean): Promise<void>;
  public async set(id_data: any, persistent_data?: boolean | T, _persistent?: boolean): Promise<void> {

    const id = typeof id_data == 'string' ? id_data : this.idFn(id_data);
    const data = typeof id_data == 'string' ?  persistent_data : id_data;
    const persistent = typeof id_data == 'string' ? _persistent : !!persistent_data;
  
    if (this.localCache) await this.localCache.set(id, data);
    if (this.redisCache) await this.redisCache.set(id, data);
    if (persistent && this.persistentStorage?.set) await this.persistentStorage.set(id, data);
  }
  
  public async del(id: string, persistent?: boolean) {
    if (this.localCache) await this.localCache.del(id);
    if (this.redisCache) await this.redisCache.del(id);
    if (persistent && this.persistentStorage?.del) await this.persistentStorage.del(id);
  }

  public async flush() {
    if (this.localCache) this.localCache.flush();
    if (this.redisCache) await this.redisCache.flush();
  }

  async close(closeConnection?: boolean) {
    if (this.localCache) this.localCache.close();
    if (this.redisCache) this.redisCache.close(closeConnection);
  }

}

export default Cache;