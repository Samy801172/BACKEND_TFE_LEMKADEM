"use strict";
var __decorate = (this && this.__decorate) || function (decorators, target, key, desc) {
    var c = arguments.length, r = c < 3 ? target : desc === null ? desc = Object.getOwnPropertyDescriptor(target, key) : desc, d;
    if (typeof Reflect === "object" && typeof Reflect.decorate === "function") r = Reflect.decorate(decorators, target, key, desc);
    else for (var i = decorators.length - 1; i >= 0; i--) if (d = decorators[i]) r = (c < 3 ? d(r) : c > 3 ? d(target, key, r) : d(target, key)) || r;
    return c > 3 && r && Object.defineProperty(target, key, r), r;
};
var __metadata = (this && this.__metadata) || function (k, v) {
    if (typeof Reflect === "object" && typeof Reflect.metadata === "function") return Reflect.metadata(k, v);
};
var JwtGuard_1;
Object.defineProperty(exports, "__esModule", { value: true });
exports.JwtGuard = void 0;
const jwt_1 = require("@nestjs/jwt");
const rxjs_1 = require("rxjs");
const security_exception_1 = require("../security.exception");
const core_1 = require("@nestjs/core");
const config_1 = require("@common/config");
const lodash_1 = require("lodash");
const operators_1 = require("rxjs/operators");
const config_2 = require("@common/config");
const enum_1 = require("@common/config/enum");
const common_1 = require("@nestjs/common");
const service_1 = require("../service");
let JwtGuard = JwtGuard_1 = class JwtGuard {
    constructor(jwtService, securityService, reflector) {
        this.jwtService = jwtService;
        this.securityService = securityService;
        this.reflector = reflector;
        this.logger = new common_1.Logger(JwtGuard_1.name);
    }
    canActivate(context) {
        const isPublic = this.reflector.getAllAndOverride(config_1.IS_PUBLIC_KEY, [
            context.getHandler(),
            context.getClass(),
        ]);
        return isPublic ? true : this.validateToken(context.switchToHttp().getRequest());
    }
    validateToken(request) {
        const authHeader = request.headers['authorization'];
        if (!(0, lodash_1.isNil)(authHeader)) {
            try {
                const token = authHeader.replace('Bearer ', '');
                const secret = config_2.configManager.getValue(enum_1.ConfigKey.JWT_TOKEN_SECRET);
                const decodedToken = this.jwtService.verify(token, { secret });
                const id = decodedToken.sub;
                return (0, rxjs_1.from)(this.securityService.detail(id)).pipe((0, operators_1.map)((user) => {
                    request.user = Object.assign(Object.assign({}, user), { role: user.isAdmin ? 'ADMIN' : 'MEMBER' });
                    return true;
                }));
            }
            catch (e) {
                throw new security_exception_1.TokenExpiredException();
            }
        }
        throw new security_exception_1.NoTokenFoundedException();
    }
};
exports.JwtGuard = JwtGuard;
exports.JwtGuard = JwtGuard = JwtGuard_1 = __decorate([
    (0, common_1.Injectable)(),
    __metadata("design:paramtypes", [jwt_1.JwtService,
        service_1.SecurityService,
        core_1.Reflector])
], JwtGuard);
//# sourceMappingURL=jwt.guard.js.map