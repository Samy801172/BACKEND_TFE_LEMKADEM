"use strict";
var __decorate = (this && this.__decorate) || function (decorators, target, key, desc) {
    var c = arguments.length, r = c < 3 ? target : desc === null ? desc = Object.getOwnPropertyDescriptor(target, key) : desc, d;
    if (typeof Reflect === "object" && typeof Reflect.decorate === "function") r = Reflect.decorate(decorators, target, key, desc);
    else for (var i = decorators.length - 1; i >= 0; i--) if (d = decorators[i]) r = (c < 3 ? d(r) : c > 3 ? d(target, key, r) : d(target, key)) || r;
    return c > 3 && r && Object.defineProperty(target, key, r), r;
};
var ApiInterceptor_1;
Object.defineProperty(exports, "__esModule", { value: true });
exports.ApiInterceptor = void 0;
const common_1 = require("@nestjs/common");
const enum_1 = require("./enum");
const config_1 = require("@common/config");
const enum_2 = require("../enum");
const lodash_1 = require("lodash");
const rxjs_1 = require("rxjs");
let ApiInterceptor = ApiInterceptor_1 = class ApiInterceptor {
    constructor() {
        this.logger = new common_1.Logger(ApiInterceptor_1.name);
    }
    intercept(context, next) {
        const ctx = context.switchToHttp();
        const path = ctx.getRequest().route.path;
        const req = ctx.getRequest();
        if (path.includes('webhook')) {
            return next.handle();
        }
        return next
            .handle()
            .pipe((0, rxjs_1.map)((response) => {
            return { code: this.map(path), data: response, result: true };
        }), (0, rxjs_1.catchError)((error) => {
            this.logger.error(error);
            throw error;
        }));
    }
    map(path) {
        const part = path
            .replace(config_1.configManager.getValue(enum_2.ConfigKey.APP_BASE_URL), '')
            .split('/')
            .filter(s => s.length > 0)
            .slice(0, 2)
            .map(s => s.toUpperCase());
        const code = enum_1.ApiCodeResponse[`${part.join('_')}_SUCCESS`];
        return (0, lodash_1.isNil)(code) ? enum_1.ApiCodeResponse.COMMON_SUCCESS : code;
    }
};
exports.ApiInterceptor = ApiInterceptor;
exports.ApiInterceptor = ApiInterceptor = ApiInterceptor_1 = __decorate([
    (0, common_1.Injectable)()
], ApiInterceptor);
//# sourceMappingURL=api.interceptor.js.map