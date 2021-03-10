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
export declare class RedisCache<T = ({
    id: string;
})> {
    private client;
    private baseKey;
    private idFn;
    private dataFn;
    private setOptions?;
    private localCacheOptions?;
    private localCache?;
    constructor(options: RedisCacheOptions<T>);
    refetch(id: string): Promise<void>;
    get(id: string): Promise<any>;
    private getLocal;
    set(id: string, data: T): Promise<void>;
    private setLocal;
    delete(id: string): Promise<void>;
    private deleteLocal;
    private getLocalExpireTime;
    defineKey(data: T): string;
    defineKey(id: string): string;
    localCacheEnabled(): boolean;
    cleanLocalCache(): void;
}
