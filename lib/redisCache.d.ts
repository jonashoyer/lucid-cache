import { Redis } from "ioredis";
import { MaybePromise } from ".";
export interface RedisCacheOptions<T> {
    client: Redis;
    prefix?: string;
    typename: string;
    idFn: (data: T) => string;
    ttl?: number | ((data: T) => MaybePromise<number>);
}
export default class RedisCache<T> {
    private client;
    private baseKey;
    private idFn;
    private _ttl?;
    constructor(options: RedisCacheOptions<T>);
    get(id: string): Promise<T | undefined>;
    all(): Promise<[string, T][]>;
    set(data: T): Promise<void>;
    set(id: string, data: T): Promise<void>;
    del(id: string): Promise<void>;
    ttl(id: string, ttl?: number): Promise<number | null>;
    defineKey(data: T): string;
    defineKey(id: string): string;
    flush(): Promise<void>;
    scanAll(pattern: string): Promise<string[]>;
    close(closeConnection?: boolean): void;
}
