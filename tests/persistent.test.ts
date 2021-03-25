import Cache from "../src"
import { getCache } from "./utils";

const createPersistentCache = () => {
  const storage = {};

  const cache = new Cache<{ [key: string]: any, id: string }>({
    persistentStorage: {
      getFn(id) { return storage[id] },
      setFn(id, data) { storage[id] = data; },
      delFn(id) { delete storage[id] },
    },
    idFn: (obj) => obj.id,
  })
  return { storage, cache };
}

describe('persistent suite', () => {

  const cache = getCache({ local: true, persistent: true });

  beforeEach(async () => {
    await cache.flush();
  })

  afterAll(async () => {
    await cache.flush();
    await cache.close();
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

  test('set', async () => {

    const { cache } = createPersistentCache();

    await cache.set({
      id: '101',
      data: [0, 1, 2, 3]
    }, true);

    const out1 = await cache.get('101');
    expect(out1).toStrictEqual({ id: '101', data: [0, 1, 2, 3] });

  })

  test('del', async () => {
    const { storage, cache } = createPersistentCache();

    await cache.set({
      id: '101',
      data: [0, 1, 2, 3]
    }, true);

    expect(storage['101']).toBeTruthy();

    await cache.del('101');
    expect(storage['101']).toBeTruthy();

    await cache.del('101', true);
    expect(storage['101']).toBeUndefined();

  })
})