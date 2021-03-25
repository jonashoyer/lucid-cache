import LocalCache, { LocalCacheOptions } from './localCache';
import RedisCache, { RedisCacheOptions } from './redisCache';
import PersistentStorage, { PersistentStorageOptions } from './persistentStorage';
export declare type MaybePromise<T> = T | Promise<T>;
export declare type DefaultCacheObject = {
    id: string;
    [key: string]: any;
};
export declare type CacheRedisOptions<T> = Omit<RedisCacheOptions<T>, 'idFn'>;
export declare type CacheLocalOptions<T> = Omit<LocalCacheOptions<T>, 'idFn'>;
export declare type CachePersistentOptions<T> = Omit<PersistentStorageOptions<T>, 'idFn'>;
export interface CacheOptions<T> {
    idFn: (data: T) => string;
    redisCache?: CacheRedisOptions<T>;
    localCache?: CacheLocalOptions<T>;
    persistentStorage?: CachePersistentOptions<T>;
}
declare class Cache<T = DefaultCacheObject> {
    idFn: (data: T) => string;
    redisCache?: RedisCache<T>;
    localCache?: LocalCache<T>;
    persistentStorage?: PersistentStorage<T>;
    constructor(options: CacheOptions<T>);
    refetch(id: string): Promise<T>;
    get(id: string, forceRefetch?: boolean): Promise<T | undefined>;
    set(data: T, persistent?: boolean): Promise<void>;
    set(id: string, data: T, persistent?: boolean): Promise<void>;
    del(id: string, persistent?: boolean): Promise<void>;
    flush(): Promise<void>;
    close(closeConnection?: boolean): Promise<void>;
}
export default Cache;
