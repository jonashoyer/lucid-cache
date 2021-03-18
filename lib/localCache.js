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
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
var ms_1 = __importDefault(require("ms"));
var LocalCache = /** @class */ (function () {
    function LocalCache(options) {
        this.cache = {};
        this.options = options;
    }
    LocalCache.prototype.get = function (id) {
        var localCacheEntry = this.cache[id];
        if (!localCacheEntry)
            return undefined;
        if (localCacheEntry.expireAt && localCacheEntry.expireAt <= Date.now()) {
            this.del(id);
            return undefined;
        }
        localCacheEntry.lastUsed = Date.now();
        return localCacheEntry.data;
    };
    LocalCache.prototype.all = function () {
        this.cleanup();
        return Object.entries(this.cache).map(function (_a) {
            var key = _a[0], data = _a[1].data;
            return ([key, data]);
        });
    };
    LocalCache.prototype.set = function (data_id, _data) {
        return __awaiter(this, void 0, void 0, function () {
            var id, data, opt;
            return __generator(this, function (_a) {
                switch (_a.label) {
                    case 0:
                        id = typeof data_id == 'string' ? data_id : this.options.idFn(data_id);
                        data = typeof data_id == 'string' ? _data : data_id;
                        return [4 /*yield*/, (typeof this.options.expiry == 'function' ? this.options.expiry(data) : this.options.expiry)];
                    case 1:
                        opt = _a.sent();
                        this.cache[id] = { data: data, lastUsed: Date.now(), expireAt: opt && this.getLocalExpireTime(opt) };
                        return [2 /*return*/];
                }
            });
        });
    };
    LocalCache.prototype.del = function (id) {
        return __awaiter(this, void 0, void 0, function () {
            return __generator(this, function (_a) {
                delete this.cache[id];
                return [2 /*return*/];
            });
        });
    };
    LocalCache.prototype.getLocalExpireTime = function (expiry) {
        switch (expiry.expiryMode) {
            case 'EX':
                if (typeof expiry.time == 'string')
                    return (Date.now() + ms_1.default(expiry.time)) / 1000;
                return Date.now() + expiry.time * 1000;
            case 'PX':
                if (typeof expiry.time == 'string')
                    return Date.now() + ms_1.default(expiry.time);
                return Date.now() + expiry.time;
            default:
                return undefined;
        }
    };
    LocalCache.prototype.cleanup = function () {
        var _this = this;
        var _a, _b;
        var items = Object.entries(this.cache);
        var expired = items.filter(function (_a) {
            var key = _a[0], expireAt = _a[1].expireAt;
            return expireAt && expireAt < Date.now();
        });
        expired.forEach(function (_a) {
            var key = _a[0];
            delete _this.cache[key];
        });
        if (((_a = this.options) === null || _a === void 0 ? void 0 : _a.maxKeys) && ((_b = this.options) === null || _b === void 0 ? void 0 : _b.maxKeys) < items.length - expired.length) {
            var items_1 = Object.entries(this.cache);
            var evictionCount = items_1.length - this.options.maxKeys;
            switch (this.options.evictionType) {
                case 'FIRST': {
                    var evictionEntries = items_1.slice(0, evictionCount);
                    evictionEntries.forEach(function (_a) {
                        var key = _a[0];
                        delete _this.cache[key];
                    });
                    break;
                }
                case 'OLDEST_USED': {
                    var evictionEntires = items_1
                        .sort(function (a, b) { return (a[1].lastUsed || Infinity) - (b[1].lastUsed || Infinity); })
                        .slice(0, evictionCount);
                    evictionEntires.forEach(function (_a) {
                        var key = _a[0];
                        delete _this.cache[key];
                    });
                    break;
                }
                case 'CLOSEST_EXPIRY':
                default: {
                    var evictionEntries = items_1
                        .sort(function (a, b) { return (a[1].expireAt || Infinity) - (b[1].expireAt || Infinity); })
                        .slice(0, evictionCount);
                    evictionEntries.forEach(function (_a) {
                        var key = _a[0];
                        delete _this.cache[key];
                    });
                    break;
                }
            }
        }
    };
    LocalCache.prototype.restore = function (cache) {
        this.cache = cache;
        this.cleanup();
    };
    LocalCache.prototype.startIntervalCheck = function () {
        this.stopIntervalCheck();
        this.periodHandle = setInterval(this.cleanup, this.options.checkPeriod);
    };
    LocalCache.prototype.stopIntervalCheck = function () {
        if (!this.periodHandle)
            return;
        clearInterval(this.periodHandle);
    };
    LocalCache.prototype.flush = function () {
        this.cache = {};
    };
    LocalCache.prototype.close = function () {
        this.stopIntervalCheck();
    };
    return LocalCache;
}());
exports.default = LocalCache;
