"use strict";
var __awaiter = (this && this.__awaiter) || function (thisArg, _arguments, P, generator) {
    function adopt(value) { return value instanceof P ? value : new P(function (resolve) { resolve(value); }); }
    return new (P || (P = Promise))(function (resolve, reject) {
        function fulfilled(value) { try { step(generator.next(value)); } catch (e) { reject(e); } }
        function rejected(value) { try { step(generator["throw"](value)); } catch (e) { reject(e); } }
        function step(result) { result.done ? resolve(result.value) : adopt(result.value).then(fulfilled, rejected); }
        step((generator = generator.apply(thisArg, _arguments || [])).next());
    });
};
var __generator = (this && this.__generator) || function (thisArg, body) {
    var _ = { label: 0, sent: function() { if (t[0] & 1) throw t[1]; return t[1]; }, trys: [], ops: [] }, f, y, t, g;
    return g = { next: verb(0), "throw": verb(1), "return": verb(2) }, typeof Symbol === "function" && (g[Symbol.iterator] = function() { return this; }), g;
    function verb(n) { return function (v) { return step([n, v]); }; }
    function step(op) {
        if (f) throw new TypeError("Generator is already executing.");
        while (_) try {
            if (f = 1, y && (t = op[0] & 2 ? y["return"] : op[0] ? y["throw"] || ((t = y["return"]) && t.call(y), 0) : y.next) && !(t = t.call(y, op[1])).done) return t;
            if (y = 0, t) op = [op[0] & 2, t.value];
            switch (op[0]) {
                case 0: case 1: t = op; break;
                case 4: _.label++; return { value: op[1], done: false };
                case 5: _.label++; y = op[1]; op = [0]; continue;
                case 7: op = _.ops.pop(); _.trys.pop(); continue;
                default:
                    if (!(t = _.trys, t = t.length > 0 && t[t.length - 1]) && (op[0] === 6 || op[0] === 2)) { _ = 0; continue; }
                    if (op[0] === 3 && (!t || (op[1] > t[0] && op[1] < t[3]))) { _.label = op[1]; break; }
                    if (op[0] === 6 && _.label < t[1]) { _.label = t[1]; t = op; break; }
                    if (t && _.label < t[2]) { _.label = t[2]; _.ops.push(op); break; }
                    if (t[2]) _.ops.pop();
                    _.trys.pop(); continue;
            }
            op = body.call(thisArg, _);
        } catch (e) { op = [6, e]; y = 0; } finally { f = t = 0; }
        if (op[0] & 5) throw op[1]; return { value: op[0] ? op[1] : void 0, done: true };
    }
};
Object.defineProperty(exports, "__esModule", { value: true });
var RedisCache = /** @class */ (function () {
    function RedisCache(options) {
        var _a, _b;
        this.client = options.client;
        this.baseKey = ((_a = options.prefix) !== null && _a !== void 0 ? _a : 'cache') + ":" + options.typename + ":";
        this.idFn = options.idFn || (function (data) { return data.id; });
        this.dataFn = options.dataFn;
        this.setOptions = options.setOptions;
        this.localCacheOptions = (options.localCacheOptions && (typeof options.localCacheOptions != 'object' ? {} : options.localCacheOptions)) || undefined;
        if (this.localCacheOptions)
            this.localCache = {};
        if ((_b = this.localCacheOptions) === null || _b === void 0 ? void 0 : _b.checkPeriod) {
            this.periodHandle = setInterval(this.cleanLocalCache, this.localCacheOptions.checkPeriod);
        }
    }
    RedisCache.prototype.refetch = function (id) {
        return __awaiter(this, void 0, void 0, function () {
            var data;
            return __generator(this, function (_a) {
                switch (_a.label) {
                    case 0: return [4 /*yield*/, this.dataFn(id)];
                    case 1:
                        data = _a.sent();
                        if (!(data !== undefined)) return [3 /*break*/, 3];
                        return [4 /*yield*/, this.set(id, data)];
                    case 2:
                        _a.sent();
                        _a.label = 3;
                    case 3: return [2 /*return*/, data];
                }
            });
        });
    };
    RedisCache.prototype.get = function (id, forceRefetch) {
        return __awaiter(this, void 0, void 0, function () {
            var local, key, json, data;
            return __generator(this, function (_a) {
                switch (_a.label) {
                    case 0:
                        if (!!forceRefetch) return [3 /*break*/, 2];
                        local = this.getLocal(id);
                        if (local !== undefined)
                            return [2 /*return*/, local];
                        key = this.defineKey(id);
                        return [4 /*yield*/, this.client.get(key)];
                    case 1:
                        json = _a.sent();
                        if (json != null) {
                            data = JSON.parse(json);
                            this.setLocal(id, data);
                            return [2 /*return*/, data];
                        }
                        _a.label = 2;
                    case 2: return [2 /*return*/, this.refetch(id)];
                }
            });
        });
    };
    RedisCache.prototype.getLocal = function (id) {
        if (!this.localCacheEnabled())
            return undefined;
        var localCacheEntry = this.localCache[id];
        if (!localCacheEntry)
            return undefined;
        if (localCacheEntry.expireAt && localCacheEntry.expireAt <= Date.now()) {
            this.deleteLocal(id);
            return undefined;
        }
        localCacheEntry.lastUsed = Date.now();
        return localCacheEntry.data;
    };
    RedisCache.prototype.set = function (idOrData, overloadData) {
        var _a, _b, _c, _d;
        return __awaiter(this, void 0, void 0, function () {
            var id, data, json, key;
            return __generator(this, function (_e) {
                switch (_e.label) {
                    case 0:
                        id = typeof idOrData == 'string' ? idOrData : this.idFn(idOrData);
                        data = typeof idOrData == 'string' ? overloadData : idOrData;
                        json = JSON.stringify(data);
                        key = this.defineKey(id);
                        if (!(((_a = this.setOptions) === null || _a === void 0 ? void 0 : _a.expiryMode) && ((_b = this.setOptions) === null || _b === void 0 ? void 0 : _b.time))) return [3 /*break*/, 2];
                        return [4 /*yield*/, this.client.set(key, json, (_c = this.setOptions) === null || _c === void 0 ? void 0 : _c.expiryMode, (_d = this.setOptions) === null || _d === void 0 ? void 0 : _d.time)];
                    case 1:
                        _e.sent();
                        return [3 /*break*/, 4];
                    case 2: return [4 /*yield*/, this.client.set(key, json)];
                    case 3:
                        _e.sent();
                        _e.label = 4;
                    case 4:
                        this.setLocal(id, data);
                        return [2 /*return*/];
                }
            });
        });
    };
    RedisCache.prototype.setLocal = function (id, data) {
        if (!this.localCacheEnabled())
            return;
        this.localCache[id] = { data: data, lastUsed: Date.now(), expireAt: this.getLocalExpireTime() };
    };
    RedisCache.prototype.delete = function (id) {
        return __awaiter(this, void 0, void 0, function () {
            var key;
            return __generator(this, function (_a) {
                switch (_a.label) {
                    case 0:
                        key = this.defineKey(id);
                        return [4 /*yield*/, this.client.del(key)];
                    case 1:
                        _a.sent();
                        this.deleteLocal(id);
                        return [2 /*return*/];
                }
            });
        });
    };
    RedisCache.prototype.deleteLocal = function (id) {
        if (!this.localCacheEnabled())
            return;
        delete this.localCache[id];
    };
    RedisCache.prototype.getLocalExpireTime = function () {
        var _a;
        switch ((_a = this.localCacheOptions) === null || _a === void 0 ? void 0 : _a.expiryMode) {
            case 'EX':
                return Date.now() + this.localCacheOptions.expireTime * 1000;
            case 'PX':
                return Date.now() + this.localCacheOptions.expireTime;
            default:
                return undefined;
        }
    };
    RedisCache.prototype.defineKey = function (data) {
        var _this = this;
        var getKeyById = function (id) {
            return _this.baseKey + id;
        };
        if (typeof data == 'string') {
            return getKeyById(data);
        }
        var id = this.idFn(data);
        return getKeyById(id);
    };
    RedisCache.prototype.localCacheEnabled = function () {
        return Boolean(this.localCacheOptions && this.localCache);
    };
    RedisCache.prototype.cleanLocalCache = function () {
        var _this = this;
        var _a, _b;
        if (!this.localCacheEnabled())
            return;
        var items = Object.entries(this.localCache);
        var expired = items.filter(function (_a) {
            var key = _a[0], expireAt = _a[1].expireAt;
            return expireAt && expireAt < Date.now();
        });
        expired.forEach(function (_a) {
            var key = _a[0];
            delete _this.localCache[key];
        });
        if (((_a = this.localCacheOptions) === null || _a === void 0 ? void 0 : _a.maxKeys) && ((_b = this.localCacheOptions) === null || _b === void 0 ? void 0 : _b.maxKeys) < items.length - expired.length) {
            var items_1 = Object.entries(this.localCache);
            var evictionCount = items_1.length - this.localCacheOptions.maxKeys;
            switch (this.localCacheOptions.evictionType) {
                case 'FIRST': {
                    var evictionEntries = items_1.slice(0, evictionCount);
                    evictionEntries.forEach(function (_a) {
                        var key = _a[0];
                        delete _this.localCache[key];
                    });
                    break;
                }
                case 'OLDEST_USED': {
                    var evictionEntires = items_1
                        .sort(function (a, b) { return (a[1].lastUsed || Infinity) - (b[1].lastUsed || Infinity); })
                        .slice(0, evictionCount);
                    evictionEntires.forEach(function (_a) {
                        var key = _a[0];
                        delete _this.localCache[key];
                    });
                    break;
                }
                case 'CLOSEST_EXPIRY':
                default: {
                    var evictionEntries = items_1
                        .sort(function (a, b) { return (a[1].expireAt || Infinity) - (b[1].expireAt || Infinity); })
                        .slice(0, evictionCount);
                    console.log(this.localCacheOptions.evictionType, evictionEntries);
                    evictionEntries.forEach(function (_a) {
                        var key = _a[0];
                        delete _this.localCache[key];
                    });
                    break;
                }
            }
        }
    };
    RedisCache.prototype.getLocalCache = function () {
        return this.localCache;
    };
    RedisCache.prototype.restoreLocalCache = function (cache) {
        this.localCache = cache;
    };
    RedisCache.prototype.clear = function () {
        return __awaiter(this, void 0, void 0, function () {
            var keys;
            return __generator(this, function (_a) {
                switch (_a.label) {
                    case 0: return [4 /*yield*/, this.scanAll(this.baseKey + "*")];
                    case 1:
                        keys = _a.sent();
                        if (keys.length == 0)
                            return [2 /*return*/];
                        return [4 /*yield*/, this.client.del(keys)];
                    case 2:
                        _a.sent();
                        return [2 /*return*/];
                }
            });
        });
    };
    RedisCache.prototype.scanAll = function (pattern) {
        return __awaiter(this, void 0, void 0, function () {
            var found, cursor, reply;
            return __generator(this, function (_a) {
                switch (_a.label) {
                    case 0:
                        found = [];
                        cursor = '0';
                        _a.label = 1;
                    case 1: return [4 /*yield*/, this.client.scan(cursor, 'MATCH', pattern)];
                    case 2:
                        reply = _a.sent();
                        cursor = reply[0];
                        found.push.apply(found, reply[1]);
                        _a.label = 3;
                    case 3:
                        if (cursor !== '0') return [3 /*break*/, 1];
                        _a.label = 4;
                    case 4: return [2 /*return*/, found];
                }
            });
        });
    };
    RedisCache.prototype.close = function (quitRedisClient) {
        return __awaiter(this, void 0, void 0, function () {
            return __generator(this, function (_a) {
                if (quitRedisClient)
                    this.client.quit();
                if (this.periodHandle)
                    clearInterval(this.periodHandle);
                return [2 /*return*/];
            });
        });
    };
    return RedisCache;
}());
exports.default = RedisCache;
