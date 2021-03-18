import { Redis } from "ioredis";
import { MaybePromise } from ".";
export interface RedisCacheOptions<T> {
    client: Redis;
    prefix?: string;
    typename: string;
    idFn: (data: T) => string;
    expiry?: RedisExpiryOptions | ((data: T) => MaybePromise<RedisExpiryOptions>);
}
export interface RedisExpiryOptions {
    expiryMode: 'EX' | 'PX' | 'EXAT' | 'PXAT' | 'NX' | 'XX';
    time: string | number;
}
export default class RedisCache<T> {
    private client;
    private baseKey;
    private idFn;
    private expiry?;
    constructor(options: RedisCacheOptions<T>);
    get(id: string): Promise<T | undefined>;
    all(): Promise<[string, T][]>;
    set(data: T): Promise<void>;
    set(id: string, data: T): Promise<void>;
    del(id: string): Promise<void>;
    defineKey(data: T): string;
    defineKey(id: string): string;
    flush(): Promise<void>;
    scanAll(pattern: string): Promise<string[]>;
    close(closeConnection?: boolean): void;
}
