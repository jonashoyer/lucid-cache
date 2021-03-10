"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.RedisCache = void 0;
const tslib_1 = require("tslib");
class RedisCache {
    constructor(options) {
        var _a, _b;
        this.client = options.client;
        this.baseKey = `${(_a = options.prefix) !== null && _a !== void 0 ? _a : 'cache'}:${options.typename}:`;
        this.idFn = options.idFn || ((data) => data.id);
        this.dataFn = options.dataFn;
        this.setOptions = options.setOptions;
        this.localCacheOptions = options.localCacheOptions;
        if (this.localCacheOptions)
            this.localCache = {};
        if ((_b = this.localCacheOptions) === null || _b === void 0 ? void 0 : _b.checkPeriod) {
            setInterval(this.cleanLocalCache, this.localCacheOptions.checkPeriod);
        }
    }
    refetch(id) {
        return tslib_1.__awaiter(this, void 0, void 0, function* () {
            const data = yield this.dataFn(id);
            if (data !== undefined)
                yield this.set(id, data);
        });
    }
    get(id) {
        return tslib_1.__awaiter(this, void 0, void 0, function* () {
            const local = this.getLocal(id);
            if (local !== undefined)
                return local;
            const key = this.defineKey(id);
            const json = yield this.client.get(key);
            if (json != null) {
                return JSON.parse(json);
            }
            const data = yield this.dataFn(id);
            if (data !== undefined)
                yield this.set(id, data);
            return data;
        });
    }
    getLocal(id) {
        if (!this.localCacheEnabled())
            return undefined;
        const localCacheEntry = this.localCache[id];
        if (localCacheEntry.expireAt && Date.now() < localCacheEntry.expireAt) {
            this.deleteLocal(id);
            return undefined;
        }
        localCacheEntry.lastUsed = Date.now();
        return localCacheEntry.data;
    }
    set(id, data) {
        var _a, _b;
        return tslib_1.__awaiter(this, void 0, void 0, function* () {
            const json = JSON.stringify(data);
            const key = this.defineKey(id);
            yield this.client.set(key, json, (_a = this.setOptions) === null || _a === void 0 ? void 0 : _a.expiryMode, (_b = this.setOptions) === null || _b === void 0 ? void 0 : _b.time);
            this.setLocal(id, data);
        });
    }
    setLocal(id, data) {
        if (!this.localCacheEnabled())
            return;
        this.localCache[id] = { data, lastUsed: Date.now(), expireAt: this.getLocalExpireTime() };
    }
    delete(id) {
        return tslib_1.__awaiter(this, void 0, void 0, function* () {
            yield this.client.del(id);
            this.deleteLocal(id);
        });
    }
    deleteLocal(id) {
        if (!this.localCacheEnabled())
            return;
        delete this.localCache[id];
    }
    getLocalExpireTime() {
        var _a;
        switch ((_a = this.localCacheOptions) === null || _a === void 0 ? void 0 : _a.expiryMode) {
            case 'EX':
                return Date.now() + this.localCacheOptions.expireTime * 1000;
            case 'PX':
                return Date.now() + this.localCacheOptions.expireTime;
            default:
                return undefined;
        }
    }
    defineKey(data) {
        const getKeyById = (id) => {
            return this.baseKey + id;
        };
        if (typeof data == 'string') {
            return getKeyById(data);
        }
        const id = this.idFn(data);
        return getKeyById(id);
    }
    localCacheEnabled() {
        return Boolean(this.localCacheOptions && this.localCache);
    }
    cleanLocalCache() {
        var _a, _b;
        if (!this.localCacheEnabled())
            return;
        const items = Object.entries(this.localCache);
        const expired = items.filter(([key, { expireAt }]) => expireAt && expireAt < Date.now());
        expired.forEach(([key]) => {
            delete this.localCache[key];
        });
        if (((_a = this.localCacheOptions) === null || _a === void 0 ? void 0 : _a.maxKeys) && ((_b = this.localCacheOptions) === null || _b === void 0 ? void 0 : _b.maxKeys) < items.length - expired.length) {
            const items = Object.entries(this.localCache);
            const evictionCount = items.length - this.localCacheOptions.maxKeys;
            switch (this.localCacheOptions.evictionType) {
                case 'FIRST': {
                    const evictionKeys = items.slice(0, evictionCount);
                    evictionKeys.forEach(([key]) => {
                        delete this.localCache[key];
                    });
                }
                case 'OLDEST_USED': {
                    const evictionKeys = items
                        .sort((a, b) => (a[1].lastUsed || Infinity) - (b[1].lastUsed || Infinity))
                        .slice(0, evictionCount);
                    evictionKeys.forEach(([key]) => {
                        delete this.localCache[key];
                    });
                }
                case 'CLOSEST_EXPIRY':
                default: {
                    const evictionKeys = items
                        .sort((a, b) => (a[1].expireAt || Infinity) - (b[1].expireAt || Infinity))
                        .slice(0, evictionCount);
                    evictionKeys.forEach(([key]) => {
                        delete this.localCache[key];
                    });
                }
            }
        }
    }
}
exports.RedisCache = RedisCache;
//# sourceMappingURL=index.js.map