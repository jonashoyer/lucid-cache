import Cache from "../src"
import Redis from 'ioredis';

export const COMMON_PREFIX = 'testsuite';
export const COMMON_TYPENAME = 'test';

export const timeout = (ms: number): Promise<void> => {
  return new Promise((r) => {
    setTimeout(r, ms);
  })
}

export const getRedis = () => {
  return new Redis('redis://localhost:6379/8');
}

export const getCache = ({ redisClient, local, persistent }: {
  redisClient?: Redis.Redis,
  local?: boolean,
  persistent?: boolean,
}) => {
  return new Cache<{ [key: string]: any, id: string }>({
    redisCache: redisClient && {
      client: redisClient,
      prefix: COMMON_PREFIX,
      typename: COMMON_TYPENAME,
    },
    localCache: local && {},
    persistentStorage: persistent && {
      getFn: (id) => ({ id }),
    },
    idFn: (obj) => obj.id,
  });
}