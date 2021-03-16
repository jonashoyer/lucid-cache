import RedisCache from "../src"
import Redis from 'ioredis';
import { timeout } from './utils';

const COMMON_PREFIX = 'testsuite';
const COMMON_TYPENAME = 'test';

const getRedis = () => {
  return new Redis('redis://localhost:6379/8');
}

const getCache = (_client?: Redis.Redis) => {
  const client = _client || getRedis();
  return new RedisCache<{ [key: string]: any, id: string }>({
    client,
    prefix: COMMON_PREFIX,
    dataFn: (id) => ({ id }),
    typename: COMMON_TYPENAME,
    idFn: (obj) => obj.id,
  });
}

describe('suite', () => {

  const client = getRedis();
  const cache = getCache();

  beforeEach(async () => {
    await cache.clear();
  })

  afterAll(async () => {
    await client.quit();
    await cache.close();
  })

  test('redis', async () => {
    const ping = await client.ping();
    expect(ping).toBe('PONG');
  })

  test('get with dataFn', async () => {

    const out = await cache.get('500');
    expect(out).toStrictEqual({ id: '500' });
    
  })

  test('set/get id with redis', async () => {
    
    const obj = { id: '600', data: '_value_' };
    await cache.set('600', obj);
    const out = await cache.get('600');
    expect(out).toStrictEqual(obj);

  })

  test('set/get data with redis', async () => {
    
    const obj = { id: '601', data: '_value_' };
    await cache.set(obj);
    const out = await cache.get('601');
    expect(out).toStrictEqual(obj);

  })

  test('delete from redis', async () => {
    
    const obj = { id: '800', data: '_value_' };
    await cache.set('800', obj);
    const out = await cache.get('800');
    expect(out).toStrictEqual(obj);

    await cache.delete('800');

    const key = cache.defineKey('800');
    const out2 = await client.get(key);
    expect(out2).toBe(null);

  })

  test('cache typenames', async () => {
    // const obj = { id: '900' };

    const cacheA = new RedisCache<{ [key: string]: any, id: string }>({
      client,
      prefix: COMMON_PREFIX,
      dataFn: (id) => ({ id, type: 'a' }),
      typename: 'a',
      idFn: (obj) => obj.id,
    });

    const objA = {
      id: '100',
      type: 'a.cache'
    };

    await cacheA.set(objA);

    const cacheB = new RedisCache<{ [key: string]: any, id: string }>({
      client,
      prefix: COMMON_PREFIX,
      dataFn: (id) => ({ id, type: 'b' }),
      typename: 'b',
      idFn: (obj) => obj.id,
    });

    const objB = {
      id: '100',
      type: 'b.cache'
    };

    await cacheB.set(objB);

    const outObjA = await cacheA.get('100');
    expect(outObjA).toStrictEqual(objA);
    
    const outObjB = await cacheB.get('100');
    expect(outObjB).toStrictEqual(objB);

    await cacheB.clear();

    const outObjA2 = await cacheA.get('100');
    expect(outObjA2).toStrictEqual(objA);

    const key = cacheB.defineKey('100');
    const out2 = await client.get(key);
    expect(out2).toBe(null);

    await cacheA.close();
    await cacheB.close();

  })

  test('refetch', async () => {

    const obj = {
      id: '1',
      data: {
        buffer: [0, 0, 0, 0]
      }
    }

    await cache.set(obj);
    await cache.refetch(obj.id);

    const out = await cache.get(obj.id);
    expect(out.data).toBeUndefined();

  })

  test('get forceRefetch', async () => {
    const obj = {
      id: '1',
      data: {
        buffer: [0, 0, 0, 0]
      }
    }

    await cache.set(obj);
    const out = await cache.get(obj.id, true);

    expect(out.data).toBeUndefined();
  })

  describe('local cache', () => {

    test('max keys', async () => {
      
      const cache = new RedisCache<{ [key: string]: any, id: string }>({
        client,
        prefix: COMMON_PREFIX,
        dataFn: (id) => ({ id, type: 'b' }),
        typename: 'max-keys',
        idFn: (obj) => obj.id,
        localCacheOptions: {
          maxKeys: 2,
          evictionType: 'FIRST',
        }
      });
      
      await Promise.all([
        cache.set({ id: '1', data: '111' }),
        cache.set({ id: '2', data: '222' }),
        cache.set({ id: '3', data: '333' }),
      ])
      
      cache.cleanLocalCache();
      
      const localCache = cache.getLocalCache()!;
      expect(localCache['1']).toBeUndefined();
      expect(localCache['2'].data.data).toBe('222');
      expect(localCache['3'].data.data).toBe('333');
      
      await cache.close();
    })

    test('oldest used evication', async () => {

      const cache = new RedisCache<{ [key: string]: any, id: string }>({
        client,
        prefix: COMMON_PREFIX,
        dataFn: (id) => ({ id, type: 'b' }),
        typename: 'oldest-used',
        idFn: (obj) => obj.id,
        localCacheOptions: {
          maxKeys: 2,
          evictionType: 'OLDEST_USED',
        }
      });

      await Promise.all([
        cache.set({ id: '1', data: '111' }),
        cache.set({ id: '2', data: '222' }),
        cache.set({ id: '3', data: '333' }),
      ])

      await timeout(1);

      await cache.get('1');
      await cache.get('2');
      cache.cleanLocalCache();
      
      const localCache = cache.getLocalCache()!;
      expect(localCache['1'].data.data).toBe('111');
      expect(localCache['2'].data.data).toBe('222');
      expect(localCache['3']).toBeUndefined();
        
      await cache.close();
    })

  })

  test('define cache key', async () => {
    const key = cache.defineKey({ id: '700', data: '_value_' });
    expect(key).toBe(`${COMMON_PREFIX}:${COMMON_TYPENAME}:700`);
  })
})
