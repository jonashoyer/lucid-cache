import LocalCache, { LocalCacheOptions } from './localCache';
import RedisCache, { RedisCacheOptions } from './redisCache';
export declare type MaybePromise<T> = T | Promise<T>;
export declare type DefaultCacheObject = {
    id: string;
    [key: string]: any;
};
export interface CacheOptions<T> {
    idFn: (data: T) => string;
    dataFn: (id: string) => MaybePromise<T>;
    redisCache?: Omit<RedisCacheOptions<T>, 'idFn'>;
    localCache?: Omit<LocalCacheOptions<T>, 'idFn'>;
}
declare class Cache<T = DefaultCacheObject> {
    idFn: (data: T) => string;
    dataFn: (id: string) => MaybePromise<T>;
    redisCache?: RedisCache<T>;
    localCache?: LocalCache<T>;
    constructor(options: CacheOptions<T>);
    refetch(id: string): Promise<T>;
    get(id: string, forceRefetch?: boolean): Promise<T>;
    set(data: T): Promise<void>;
    set(id: string, data: T): Promise<void>;
    del(id: string): Promise<void>;
    flush(): Promise<void>;
    close(closeConnection?: boolean): Promise<void>;
}
export default Cache;
