import Cache from "../src"
import { COMMON_PREFIX, COMMON_TYPENAME, getCache, getRedis, timeout } from "./utils";

describe('redis suite', () => {

  const redisClient = getRedis();
  const cache = getCache({ redisClient });

  beforeEach(async () => {
    await cache.flush();
  })

  afterAll(async () => {
    await cache.flush();
    await redisClient.quit();
    await cache.close();
  })

  test('redis', async () => {
    const ping = await redisClient.ping();
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
    const out2 = await redisClient.get(key);
    expect(out2).toBe(null);

  })

  test('cache typenames', async () => {
    // const obj = { id: '900' };

    const cacheA = new Cache<{ [key: string]: any, id: string }>({
      redisCache: {
        client: redisClient,
        prefix: COMMON_PREFIX,
        typename: 'a',
      },
      idFn: (obj) => obj.id,
    });

    const objA = {
      id: '100',
      type: 'a.cache'
    };

    await cacheA.set(objA);

    const cacheB = new Cache<{ [key: string]: any, id: string }>({
      redisCache: {
        client: redisClient,
        prefix: COMMON_PREFIX,
        typename: 'b',
      },
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
    const out2 = await redisClient.get(key);
    expect(out2).toBe(null);

    await cacheA.flush();
    await cacheA.close();
    await cacheB.flush();
    await cacheB.close();

  })

  test('refetch', async () => {

    // const obj = {
    //   id: '1',
    //   data: {
    //     buffer: [0, 0, 0, 0]
    //   }
    // }

    // await cache.set(obj);
    // await cache.refetch(obj.id);

    // const out = await cache.get(obj.id);
    // expect(out.data).toBeUndefined();

  })

  test('get forceRefetch', async () => {
    // const obj = {
    //   id: '1',
    //   data: {
    //     buffer: [0, 0, 0, 0]
    //   }
    // }

    // await cache.set(obj);
    // const out1 = await cache.get(obj.id);
    // expect(out1).toStrictEqual(obj);

    // const out2 = await cache.get(obj.id);
    // expect(out2.data).toBeUndefined();
  })

  test('redis expire', async () => {
    const cache = new Cache<{ [key: string]: any, id: string }>({
      redisCache: {
        client: redisClient,
        prefix: COMMON_PREFIX,
        typename: 'period',
        ttl: 4,
      },
      idFn: (obj) => obj.id,
    });

    await cache.set({ id: '8', value: 8 })

    const out1 = await cache.get('8');
    expect(out1).toStrictEqual({ id: '8', value: 8 });

    await timeout(8);

    const out2 = await cache.get('8');

    expect(out2).toBeUndefined();

    await cache.flush();
    await cache.close();
  })

  test('redis ttl', async () => {
    await cache.set({ id: '8', data: 'ttl8' });

    const outTtl1 = await cache.redisCache.ttl('8');
    expect(outTtl1).toBeNull();

    const outTtl2 = await cache.redisCache.ttl('8', 4);
    expect(outTtl2).toBeGreaterThan(0);
    const outTtl3 = await cache.redisCache.ttl('8');
    expect(outTtl3).toBeGreaterThan(0);

    const out1 = await cache.redisCache.get('8');
    expect(out1).toStrictEqual({ id: '8', data: 'ttl8' });

    await timeout(5);
    const out2 = await cache.redisCache.get('8');
    expect(out2).toBeUndefined();

  })

  test('redis cache get all', async () => {

    const cache = new Cache<{ [key: string]: any, id: string }>({
      redisCache: {
        client: redisClient,
        typename: 'get-all',
      },
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