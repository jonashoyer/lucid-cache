"use strict";
var __assign = (this && this.__assign) || function () {
    __assign = Object.assign || function(t) {
        for (var s, i = 1, n = arguments.length; i < n; i++) {
            s = arguments[i];
            for (var p in s) if (Object.prototype.hasOwnProperty.call(s, p))
                t[p] = s[p];
        }
        return t;
    };
    return __assign.apply(this, arguments);
};
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
var localCache_1 = __importDefault(require("./localCache"));
var redisCache_1 = __importDefault(require("./redisCache"));
var persistentStorage_1 = __importDefault(require("./persistentStorage"));
var Cache = /** @class */ (function () {
    function Cache(options) {
        var idFn = options.idFn, redisCache = options.redisCache, localCache = options.localCache, persistentStorage = options.persistentStorage;
        this.idFn = idFn;
        if (redisCache)
            this.redisCache = new redisCache_1.default(__assign(__assign({}, redisCache), { idFn: idFn }));
        if (localCache)
            this.localCache = new localCache_1.default(__assign(__assign({}, localCache), { idFn: idFn }));
        if (persistentStorage)
            this.persistentStorage = new persistentStorage_1.default(__assign(__assign({}, persistentStorage), { idFn: idFn }));
    }
    Cache.prototype.refetch = function (id) {
        var _a;
        return __awaiter(this, void 0, void 0, function () {
            var data;
            return __generator(this, function (_b) {
                switch (_b.label) {
                    case 0:
                        if (!this.persistentStorage)
                            throw new Error("Can't refetch without persistent storage!");
                        if (!((_a = this.persistentStorage) === null || _a === void 0 ? void 0 : _a.get))
                            throw new Error("Can't refetch without persistent storage 'getFn'!");
                        return [4 /*yield*/, this.persistentStorage.get(id)];
                    case 1:
                        data = _b.sent();
                        if (!(data !== undefined)) return [3 /*break*/, 3];
                        return [4 /*yield*/, this.set(id, data)];
                    case 2:
                        _b.sent();
                        _b.label = 3;
                    case 3: return [2 /*return*/, data];
                }
            });
        });
    };
    Cache.prototype.get = function (id, forceRefetch) {
        var _a;
        return __awaiter(this, void 0, void 0, function () {
            var localData, redisData;
            return __generator(this, function (_b) {
                switch (_b.label) {
                    case 0:
                        if (forceRefetch)
                            return [2 /*return*/, this.refetch(id)];
                        if (this.localCache) {
                            localData = this.localCache.get(id);
                            if (localData)
                                return [2 /*return*/, localData];
                        }
                        if (!this.redisCache) return [3 /*break*/, 2];
                        return [4 /*yield*/, this.redisCache.get(id)];
                    case 1:
                        redisData = _b.sent();
                        if (redisData) {
                            if (this.localCache)
                                this.localCache.set(id, redisData);
                            return [2 /*return*/, redisData];
                        }
                        _b.label = 2;
                    case 2:
                        if (!((_a = this.persistentStorage) === null || _a === void 0 ? void 0 : _a.get)) {
                            return [2 /*return*/, undefined];
                        }
                        return [2 /*return*/, this.refetch(id)];
                }
            });
        });
    };
    Cache.prototype.set = function (id_data, persistent_data, _persistent) {
        var _a;
        return __awaiter(this, void 0, void 0, function () {
            var id, data, persistent;
            return __generator(this, function (_b) {
                switch (_b.label) {
                    case 0:
                        id = typeof id_data == 'string' ? id_data : this.idFn(id_data);
                        data = typeof id_data == 'string' ? persistent_data : id_data;
                        persistent = typeof id_data == 'string' ? _persistent : !!persistent_data;
                        if (!this.localCache) return [3 /*break*/, 2];
                        return [4 /*yield*/, this.localCache.set(id, data)];
                    case 1:
                        _b.sent();
                        _b.label = 2;
                    case 2:
                        if (!this.redisCache) return [3 /*break*/, 4];
                        return [4 /*yield*/, this.redisCache.set(id, data)];
                    case 3:
                        _b.sent();
                        _b.label = 4;
                    case 4:
                        if (!(persistent && ((_a = this.persistentStorage) === null || _a === void 0 ? void 0 : _a.set))) return [3 /*break*/, 6];
                        return [4 /*yield*/, this.persistentStorage.set(id, data)];
                    case 5:
                        _b.sent();
                        _b.label = 6;
                    case 6: return [2 /*return*/];
                }
            });
        });
    };
    Cache.prototype.del = function (id, persistent) {
        var _a;
        return __awaiter(this, void 0, void 0, function () {
            return __generator(this, function (_b) {
                switch (_b.label) {
                    case 0:
                        if (!this.localCache) return [3 /*break*/, 2];
                        return [4 /*yield*/, this.localCache.del(id)];
                    case 1:
                        _b.sent();
                        _b.label = 2;
                    case 2:
                        if (!this.redisCache) return [3 /*break*/, 4];
                        return [4 /*yield*/, this.redisCache.del(id)];
                    case 3:
                        _b.sent();
                        _b.label = 4;
                    case 4:
                        if (!(persistent && ((_a = this.persistentStorage) === null || _a === void 0 ? void 0 : _a.del))) return [3 /*break*/, 6];
                        return [4 /*yield*/, this.persistentStorage.del(id)];
                    case 5:
                        _b.sent();
                        _b.label = 6;
                    case 6: return [2 /*return*/];
                }
            });
        });
    };
    Cache.prototype.flush = function () {
        return __awaiter(this, void 0, void 0, function () {
            return __generator(this, function (_a) {
                switch (_a.label) {
                    case 0:
                        if (this.localCache)
                            this.localCache.flush();
                        if (!this.redisCache) return [3 /*break*/, 2];
                        return [4 /*yield*/, this.redisCache.flush()];
                    case 1:
                        _a.sent();
                        _a.label = 2;
                    case 2: return [2 /*return*/];
                }
            });
        });
    };
    Cache.prototype.close = function (closeConnection) {
        return __awaiter(this, void 0, void 0, function () {
            return __generator(this, function (_a) {
                if (this.localCache)
                    this.localCache.close();
                if (this.redisCache)
                    this.redisCache.close(closeConnection);
                return [2 /*return*/];
            });
        });
    };
    return Cache;
}());
exports.default = Cache;
