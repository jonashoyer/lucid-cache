import Cache from "../src"
import { COMMON_PREFIX, getCache, getRedis, timeout } from "./utils";

describe('local suite', () => {

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

  test('get local cache expire', async () => {

    const cache = new Cache<{ [key: string]: any, id: string }>({
      redisCache: {
        client: redisClient,
        prefix: COMMON_PREFIX,
        typename: 'period',
      },
      localCache: {
        ttl: 8,
      },
      idFn: (obj) => obj.id,
    });

    cache.localCache.restore({ '5': { data: { id: '5', isLocal: true }, expireAt: Date.now() + 2 } })
    expect(cache.localCache.cache['5']).toBeTruthy();

    const out1 = await cache.get('5');
    expect(out1.isLocal).toBeTruthy();

    await timeout(8);

    const out2 = await cache.get('5');
    expect(out2).toBeUndefined();

    await cache.flush();
    await cache.close();

  })

  test('local cache del key', async () => {

    const cache = new Cache({
      localCache: {},
      idFn: (obj) => obj.id,
    })

    await cache.set({ id: '31', value: '3131' });
    const out1 = await cache.get('31');
    expect(out1).toStrictEqual({ id: '31', value: '3131' });

    await cache.del('31');

    const out2 = await cache.get('31');
    expect(out2).toBeUndefined();
  })

  test('clean local cache expire', async () => {
    const cache = new Cache<{ [key: string]: any, id: string }>({
      redisCache: {
        client: redisClient,
        prefix: COMMON_PREFIX,
        typename: 'period',
      },
      localCache: {
        ttl: 4,
      },
      idFn: (obj) => obj.id,
    });

    cache.localCache.restore({ '5': { data: { id: '5', isLocal: true }, expireAt: Date.now() + 2 } })
    expect(cache.localCache.cache['5']).toBeTruthy();

    const out1 = await cache.get('5');
    expect(out1.isLocal).toBeTruthy();

    await timeout(4);

    cache.localCache.cleanup();

    const out2 = await cache.get('5');
    expect(out2).toBeUndefined();

    await cache.flush();
    await cache.close();
  })

  test('local ttl', async () => {
    const cache = new Cache<{ [key: string]: any, id: string }>({
      localCache: {},
      idFn: (obj) => obj.id,
    })

    await cache.set({ id: '14', value: 'ttl14' });
    const ttl1 = cache.localCache.ttl('14');
    expect(ttl1).toBeNull();

    cache.localCache.ttl('14', 4);
    const ttl2 = cache.localCache.ttl('14');
    expect(ttl2).toBeGreaterThan(0);
    const out1 = cache.localCache.get('14');
    expect(out1).toStrictEqual({ id: '14', value: 'ttl14' });

    await timeout(5);
    const out2 = cache.localCache.get('14');
    expect(out2).toBeUndefined();

  })

  test('max keys', async () => {

    const cache = new Cache<{ [key: string]: any, id: string }>({
      redisCache: {
        client: redisClient,
        prefix: COMMON_PREFIX,
        typename: 'max-keys',
      },
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
        client: redisClient,
        prefix: COMMON_PREFIX,
        typename: 'oldest-used',
      },
      localCache: {
        maxKeys: 2,
        evictionType: 'OLDEST_USED',
      },
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
        client: redisClient,
        prefix: COMMON_PREFIX,
        typename: 'oldest-used',
      },
      localCache: {
        maxKeys: 2,
        evictionType: 'FIRST',
      },
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
        client: redisClient,
        prefix: COMMON_PREFIX,
        typename: 'closest-expiry',
      },
      localCache: {
        maxKeys: 2,
        evictionType: 'CLOSEST_EXPIRY',
      },
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

    const cache = new Cache<{ [key: string]: any, id: string }>({
      localCache: {},
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

  test('redis cache populate local cache', async () => {

    const cache = new Cache<{ [key: string]: any, id: string }>({
      redisCache: {
        client: redisClient,
        typename: 'redis-local',
      },
      localCache: {},
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