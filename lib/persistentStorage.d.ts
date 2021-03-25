import { MaybePromise } from ".";
export interface PersistentStorageOptions<T> {
    idFn: (data: T) => string;
    getFn?: (id: string) => MaybePromise<T>;
    setFn?: (id: string, data: T) => MaybePromise<void>;
    delFn?: (id: string) => MaybePromise<void>;
}
export default class PersistentStorage<T> {
    private options;
    constructor(options: PersistentStorageOptions<T>);
    get(id: string): MaybePromise<T>;
    set(data: T): Promise<void>;
    set(id: string, data: T): Promise<void>;
    del(id: string): MaybePromise<void>;
}
