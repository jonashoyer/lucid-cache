import RedisCache from "../src"
import Redis from 'ioredis';

const COMMON_PREFIX = 'testsuit';
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

describe('suit', () => {

  const client = getRedis();
  const cache = getCache();

  beforeEach(async () => {
    await cache.clear();
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

  })

  test('define cache key', async () => {
    const key = cache.defineKey({ id: '700', data: '_value_' });
    expect(key).toBe(`${COMMON_PREFIX}:${COMMON_TYPENAME}:700`);
  })
})
