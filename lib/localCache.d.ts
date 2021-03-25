import { MaybePromise } from ".";
export interface LocalCacheOptions<T> {
    idFn: (data: T) => string;
    ttl?: number | ((data: T) => MaybePromise<number>);
    maxKeys?: number;
    evictionType?: 'OLDEST_USED' | 'CLOSEST_EXPIRY' | 'FIRST';
    checkPeriod?: number;
}
declare type LocalCacheObject<T> = {
    [key: string]: {
        data: T;
        expireAt?: number;
        lastUsed?: number;
    };
};
export default class LocalCache<T> {
    cache: LocalCacheObject<T>;
    private options;
    private periodHandle?;
    constructor(options: LocalCacheOptions<T>);
    get(id: string): T | undefined;
    all(): [string, T][];
    set(data: T): Promise<void>;
    set(id: string, data: T): Promise<void>;
    del(id: string): void;
    ttl(id: string, ttl?: number): number | null;
    cleanup(): void;
    restore(cache: LocalCacheObject<T>): void;
    startIntervalCheck(): void;
    stopIntervalCheck(): void;
    flush(): void;
    close(): void;
}
export {};
