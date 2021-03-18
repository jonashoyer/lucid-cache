import { MaybePromise } from ".";
export interface LocalCacheOptions<T> {
    idFn: (data: T) => string;
    expiry?: LocalExpiryOptions | ((data: T) => MaybePromise<LocalExpiryOptions>);
    maxKeys?: number;
    evictionType?: 'OLDEST_USED' | 'CLOSEST_EXPIRY' | 'FIRST';
    checkPeriod?: number;
}
export interface LocalExpiryOptions {
    expiryMode: 'EX' | 'PX';
    time: string | number;
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
    del(id: string): Promise<void>;
    private getLocalExpireTime;
    cleanup(): void;
    restore(cache: LocalCacheObject<T>): void;
    startIntervalCheck(): void;
    stopIntervalCheck(): void;
    flush(): void;
    close(): void;
}
export {};
