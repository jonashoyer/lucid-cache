import { Redis } from 'ioredis';
declare type MaybePromise<T> = T | Promise<T>;
export declare type LocalCache<T> = {
    [id: string]: {
        data: T;
        expireAt?: number;
        lastUsed?: number;
    };
};
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
declare class RedisCache<T = ({
    id: string;
})> {
    private client;
    private baseKey;
    private idFn;
    private dataFn;
    private setOptions?;
    private localCacheOptions?;
    private localCache?;
    private periodHandle?;
    constructor(options: RedisCacheOptions<T>);
    refetch(id: string): Promise<T>;
    get(id: string, forceRefetch?: boolean): Promise<T>;
    private getLocal;
    set(data: T): Promise<void>;
    set(id: string, data: T): Promise<void>;
    private setLocal;
    delete(id: string): Promise<void>;
    private deleteLocal;
    private getLocalExpireTime;
    defineKey(data: T): string;
    defineKey(id: string): string;
    localCacheEnabled(): boolean;
    cleanLocalCache(): void;
    getLocalCache(): LocalCache<T> | undefined;
    restoreLocalCache(cache: LocalCache<T>): void;
    clear(): Promise<void>;
    scanAll(pattern: string): Promise<string[]>;
    close(quitRedisClient?: boolean): Promise<void>;
}
export default RedisCache;
