import { MaybePromise } from ".";

export interface PersistentStorageOptions<T> {
  idFn: (data: T) => string;
  getFn?: (id: string) => MaybePromise<T>;
  setFn?: (id: string, data: T) => MaybePromise<void>;
  delFn?: (id: string) => MaybePromise<void>;
}

export default class PersistentStorage<T> {

  private options: PersistentStorageOptions<T>;

  constructor(options: PersistentStorageOptions<T>) {
    this.options = options;
  }

  get(id: string) {
    if (!this.options.getFn) throw new Error("Persistent storage can't get without a 'getFn'!");
    return this.options.getFn(id);
  }

  async set(data: T): Promise<void>;
  async set(id: string, data: T): Promise<void>;
  async set(data_id: any, _data?: T): Promise<void> {
    if (!this.options.setFn) throw new Error("Persistent storage can't set without a 'setFn'!");
    const id = typeof data_id == 'string' ? data_id : this.options.idFn(data_id);
    const data = typeof data_id == 'string' ? _data : data_id;

    return this.options.setFn(id, data);
  }

  del(id: string) {
    if (!this.options.delFn) throw new Error("Persistent storage can't delete without a 'delFn'!");
    return this.options.delFn(id);
  }
}