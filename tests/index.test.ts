import Cache from "../src"
import Redis from 'ioredis';
import { timeout } from './utils';

const COMMON_PREFIX = 'testsuite';
const COMMON_TYPENAME = 'test';

const getRedis = () => {
  return new Redis('redis://localhost:6379/8');
}

const getCache = (_client?: Redis.Redis) => {
  const client = _client || getRedis();
  return new Cache<{ [key: string]: any, id: string }>({
    redisCache: {
      client,
      prefix: COMMON_PREFIX,
      typename: COMMON_TYPENAME,
    },
    dataFn: (id) => ({ id }),
    idFn: (obj) => obj.id,
  });
}

describe('suite', () => {

  const client = getRedis();
  const cache = getCache();

  beforeEach(async () => {
    await cache.flush();
  })

  afterAll(async () => {
    await cache.flush();
    await client.quit();
    await cache.close();
  })

  test('get with dataFn', async () => {

    const out = await cache.get('500');
    expect(out).toStrictEqual({ id: '500' });

  })

  describe('redis cache', () => {

    test('redis', async () => {
      const ping = await client.ping();
      expect(ping).toBe('PONG');
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

      await cache.del('800');

      const key = cache.redisCache.defineKey('800');
      const out2 = await client.get(key);
      expect(out2).toBe(null);

    })

    test('cache typenames', async () => {
      // const obj = { id: '900' };

      const cacheA = new Cache<{ [key: string]: any, id: string }>({
        redisCache: {
          client,
          prefix: COMMON_PREFIX,
          typename: 'a',
        },
        dataFn: (id) => ({ id, type: 'a' }),
        idFn: (obj) => obj.id,
      });

      const objA = {
        id: '100',
        type: 'a.cache'
      };

      await cacheA.set(objA);

      const cacheB = new Cache<{ [key: string]: any, id: string }>({
        redisCache: {
          client,
          prefix: COMMON_PREFIX,
          typename: 'b',
        },
        dataFn: (id) => ({ id, type: 'b' }),
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

      await cacheB.flush();

      const outObjA2 = await cacheA.get('100');
      expect(outObjA2).toStrictEqual(objA);

      const key = cacheB.redisCache.defineKey('100');
      const out2 = await client.get(key);
      expect(out2).toBe(null);

      await cacheA.flush();
      await cacheA.close();
      await cacheB.flush();
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
      const out1 = await cache.get(obj.id);
      expect(out1).toStrictEqual(obj);

      const out2 = await cache.get(obj.id, true);
      expect(out2.data).toBeUndefined();
    })

    test('redis expire', async () => {
      const cache = new Cache<{ [key: string]: any, id: string }>({
        redisCache: {
          client,
          prefix: COMMON_PREFIX,
          typename: 'period',
          expiry: {
            expiryMode: 'PX',
            time: 4

          }
        },
        dataFn: (id) => ({ id }),
        idFn: (obj) => obj.id,
      });

      await cache.set({ id: '8', value: 8 })

      const out1 = await cache.get('8');
      expect(out1).toStrictEqual({ id: '8', value: 8 });

      await timeout(8);

      const out2 = await cache.get('8');

      expect(out2.value).toBeUndefined();

      await cache.flush();
      await cache.close();
    })

    test('redis cache get all', async () => {

      const cache = new Cache<{ [key: string]: any, id: string  }>({
        redisCache: {
          client,
          typename: 'get-all',
        },
        dataFn: (id) => ({ id }),
        idFn: (obj) => obj.id,
      })

      await cache.set({ id: '5', value: '555' });
      await cache.set({ id: '8', value: '888' });

      const data = await cache.redisCache.all();
      const keys = data.map(([key]) => key);
      
      expect(keys).toContain('5');
      expect(keys).toContain('8');
      expect(keys).toHaveLength(2);

      expect(data.find(([key]) => key === '5')[1].value).toEqual('555');
      expect(data.find(([key]) => key === '8')[1].value).toEqual('888');

      await cache.flush();
      await cache.close();

    })

    test('define cache key', async () => {
      const key = cache.redisCache.defineKey({ id: '700', data: '_value_' });
      expect(key).toBe(`${COMMON_PREFIX}:${COMMON_TYPENAME}:700`);
    })

  })


  describe('local cache', () => {

    test('get local cache expire', async () => {

      const cache = new Cache<{ [key: string]: any, id: string }>({
        redisCache: {
          client,
          prefix: COMMON_PREFIX,
          typename: 'period',
        },
        localCache: {
          expiry: {
            expiryMode: 'PX',
            time: 8,
          }
        },
        dataFn: (id) => ({ id }),
        idFn: (obj) => obj.id,
      });

      cache.localCache.restore({ '5': { data: { id: '5', isLocal: true }, expireAt: Date.now() + 2 } })
      expect(cache.localCache.cache['5']).toBeTruthy();

      const out1 = await cache.get('5');
      expect(out1.isLocal).toBeTruthy();

      await timeout(8);

      const out2 = await cache.get('5');
      expect(out2.isLocal).toBeUndefined();

      await cache.flush();
      await cache.close();

    })

    test('local cache del key', async () => {

      const cache = new Cache({
        localCache: {},
        dataFn: (id) => ({ id }),
        idFn: (obj) => obj.id,
      })

      await cache.set({ id: '31', value: '3131' });
      const out1 = await cache.get('31');
      expect(out1).toStrictEqual({ id: '31', value: '3131' });
      
      await cache.del('31');

      const out2 = await cache.get('31');
      expect(out2).toStrictEqual({ id: '31' });
    })

    test('clean local cache expire', async () => {
      const cache = new Cache<{ [key: string]: any, id: string }>({
        redisCache: {
          client,
          prefix: COMMON_PREFIX,
          typename: 'period',
        },
        localCache: {
          expiry: {
            expiryMode: 'EX',
            time: 0.004
          }
        },
        dataFn: (id) => ({ id }),
        idFn: (obj) => obj.id,
      });

      cache.localCache.restore({ '5': { data: { id: '5', isLocal: true }, expireAt: Date.now() + 2 } })
      expect(cache.localCache.cache['5']).toBeTruthy();

      const out1 = await cache.get('5');
      expect(out1.isLocal).toBeTruthy();

      await timeout(4);

      cache.localCache.cleanup();

      const out2 = await cache.get('5');
      expect(out2.isLocal).toBeUndefined();

      await cache.flush();
      await cache.close();
    })

    test('max keys', async () => {

      const cache = new Cache<{ [key: string]: any, id: string }>({
        redisCache: {
          client,
          prefix: COMMON_PREFIX,
          typename: 'max-keys',
        },
        dataFn: (id) => ({ id, type: 'b' }),
        idFn: (obj) => obj.id,
        localCache: {
          maxKeys: 2,
          evictionType: 'FIRST',
        }
      });

      await Promise.all([
        cache.set({ id: '1', data: '111' }),
        cache.set({ id: '2', data: '222' }),
        cache.set({ id: '3', data: '333' }),
      ])

      cache.localCache.cleanup();

      const localCache = cache.localCache.cache;
      expect(localCache['1']).toBeUndefined();
      expect(localCache['2'].data.data).toBe('222');
      expect(localCache['3'].data.data).toBe('333');

      await cache.flush();
      await cache.close();
    })

    test('evication type: oldest', async () => {

      const cache = new Cache<{ [key: string]: any, id: string }>({
        redisCache: {
          client,
          prefix: COMMON_PREFIX,
          typename: 'oldest-used',
        },
        localCache: {
          maxKeys: 2,
          evictionType: 'OLDEST_USED',
        },
        dataFn: (id) => ({ id, type: 'b' }),
        idFn: (obj) => obj.id,
      });

      cache.localCache.restore({
        '1': {
          data: { id: '1', data: '111' },
          lastUsed: 9,
          expireAt: undefined,
        },
        '2': {
          data: { id: '2', data: '222' },
          lastUsed: 1,
          expireAt: undefined,
        },
        '3': {
          data: { id: '3', data: '333' },
          lastUsed: 10,
          expireAt: undefined,
        },
      })

      cache.localCache.cleanup();

      const localCache = cache.localCache.cache;

      expect(localCache['1'].data.data).toBe('111');
      expect(localCache['2']).toBeUndefined();
      expect(localCache['3'].data.data).toBe('333');

      await cache.close();
    })

    test('evication type: first', async () => {

      const cache = new Cache<{ [key: string]: any, id: string }>({
        redisCache: {
          client,
          prefix: COMMON_PREFIX,
          typename: 'oldest-used',
        },
        localCache: {
          maxKeys: 2,
          evictionType: 'FIRST',
        },
        dataFn: (id) => ({ id, type: 'b' }),
        idFn: (obj) => obj.id,
      });

      await cache.set({ id: '1', data: '111' }),
        await cache.set({ id: '2', data: '222' }),
        await cache.set({ id: '3', data: '333' }),

        await timeout(1);

      await cache.get('1');
      await cache.get('2');

      cache.localCache.cleanup();

      const localCache = cache.localCache.cache;
      expect(localCache['1']).toBeUndefined();
      expect(localCache['2'].data.data).toBe('222');
      expect(localCache['3'].data.data).toBe('333');

      await cache.close();
    })

    test('evication type: closest expiry', async () => {

      const cache = new Cache<{ [key: string]: any, id: string }>({
        redisCache: {
          client,
          prefix: COMMON_PREFIX,
          typename: 'closest-expiry',
        },
        localCache: {
          maxKeys: 2,
          evictionType: 'CLOSEST_EXPIRY',
        },
        dataFn: (id) => ({ id, type: 'c' }),
        idFn: (obj) => obj.id,
      });

      cache.localCache.restore({
        '1': {
          data: { id: '1', data: '111' },
          expireAt: Date.now() + 500,
        },
        '2': {
          data: { id: '2', data: '222' },
          expireAt: Date.now() + 100,
        },
        '3': {
          data: { id: '3', data: '333' },
          expireAt: Date.now() + 600
        },
      })

      cache.localCache.cleanup();

      const localCache = cache.localCache.cache;
      expect(localCache['1'].data.data).toBe('111');
      expect(localCache['2']).toBeUndefined();
      expect(localCache['3'].data.data).toBe('333');

      await cache.close();
    })

    test('restore local cache', async () => {

      const cache = new Cache<{ [key: string]: any, id: string }>({
        localCache: {},
        dataFn: (id) => ({ id, type: 'b' }),
        idFn: (obj) => obj.id,
      });

      const cacheData = {
        '1': { data: { id: '1', value: 11 } }
      };

      cache.localCache.restore(cacheData);

      const out = await cache.get('1');
      expect(out).toStrictEqual({ id: '1', value: 11 });

    })

    test('local cache get all', async () => {

      const cache = new Cache<{ [key: string]: any, id: string  }>({
        localCache: {},
        dataFn: (id) => ({ id }),
        idFn: (obj) => obj.id,
      })


      await cache.set({ id: '5', value: '555' });
      await cache.set({ id: '8', value: '888' });

      const data = await cache.localCache.all();
      const keys = data.map(([key]) => key);
      
      expect(keys).toContain('5');
      expect(keys).toContain('8');
      expect(keys).toHaveLength(2);

      expect(data.find(([key]) => key === '5')[1].value).toEqual('555');
      expect(data.find(([key]) => key === '8')[1].value).toEqual('888');

      await cache.flush();
      await cache.close();

    })
  })

  test('redis cache populate local cache', async () => {

    const cache = new Cache<{ [key: string]: any, id: string  }>({
      redisCache: {
        client,
        typename: 'redis-local',
      },
      localCache: {},
      dataFn: (id) => ({ id }),
      idFn: (obj) => obj.id,
    });

    await cache.set({ id: '38', value: '3888' });
    cache.localCache.flush();
    
    const out1 = cache.localCache.get('38');
    expect(out1).toBeUndefined();

    const out2 = await cache.redisCache.get('38');
    expect(out2).toStrictEqual({ id: '38', value: '3888' });

    const out3 = await cache.get('38');
    expect(out3).toStrictEqual({ id: '38', value: '3888' });

    const out4 = cache.localCache.get('38');
    expect(out4).toStrictEqual({ id: '38', value: '3888' });

  })
})
