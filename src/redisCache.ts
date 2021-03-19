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

  private client: Redis;
  private baseKey: string;
  private idFn: (data: T) => string;
  private _ttl?: number | ((data: T) => MaybePromise<number>);

  constructor(options: RedisCacheOptions<T>) {
    this.client = options.client;
    this.baseKey = `${options.prefix ?? 'cache'}:${options.typename}:`;
    this.idFn = options.idFn;
    this._ttl = options.ttl;
  }

  async get(id: string): Promise<T | undefined> {
    const key = this.defineKey(id);
    const json = await this.client.get(key);
    if (json == null) return undefined;
    return JSON.parse(json);
  }

  async all(): Promise<[string, T][]> {
    const keys = await this.scanAll(`${this.baseKey}*`);
    const jsonArr = await this.client.mget(keys);
    return jsonArr.filter(j => j !== null).map(j => {
      const data = JSON.parse(j as any);
      const id = this.idFn(data);
      return [id, data];
    });
  }

  async set(data: T): Promise<void>;
  async set(id: string, data: T): Promise<void>;
  async set(data_id: any, _data?: T): Promise<void> {
    const id = typeof data_id == 'string' ? data_id : this.idFn(data_id);
    const data = typeof data_id == 'string' ? _data : data_id

    const json = JSON.stringify(data);
    const key = this.defineKey(id);

    if (this._ttl) {
      const time = await (typeof this._ttl == 'function' ? this._ttl(data) : this._ttl);
      await this.client.set(key, json, 'PX', time);
      return;
    }

    await this.client.set(key, json);
    
  }

  async del(id: string) {
    const key = this.defineKey(id);
    await this.client.del(key);
  }

  async ttl(id: string, ttl?: number) {
    const key = this.defineKey(id);
    if (ttl) {
      await this.client.pexpire(key, ttl);
      return ttl;
    }
    const time = await this.client.pttl(key);
    if (time < 0) return null;
    return time;
  }

  defineKey(data: T): string;
  defineKey(id: string): string;
  defineKey(data: any) {

    const getKeyById = (id: string) => {
      return this.baseKey + id;
    }

    if (typeof data == 'string') {
      return getKeyById(data);
    }

    const id = this.idFn(data);
    return getKeyById(id);
  }

  async flush() {
    const keys = await this.scanAll(`${this.baseKey}*`);
    if (keys.length == 0) return;
    await this.client.del(keys);
  }

  async scanAll (pattern: string) {
    const found: string[] = [];
    let cursor = '0';
  
    do {
      const reply = await this.client.scan(cursor, 'MATCH', pattern);
  
      cursor = reply[0];
      found.push(...reply[1]);
    } while (cursor !== '0');
  
    return found;
  }

  close(closeConnection?: boolean) {
    if (closeConnection) this.client.quit();
  }

}