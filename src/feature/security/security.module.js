"use strict";
var __decorate = (this && this.__decorate) || function (decorators, target, key, desc) {
    var c = arguments.length, r = c < 3 ? target : desc === null ? desc = Object.getOwnPropertyDescriptor(target, key) : desc, d;
    if (typeof Reflect === "object" && typeof Reflect.decorate === "function") r = Reflect.decorate(decorators, target, key, desc);
    else for (var i = decorators.length - 1; i >= 0; i--) if (d = decorators[i]) r = (c < 3 ? d(r) : c > 3 ? d(target, key, r) : d(target, key)) || r;
    return c > 3 && r && Object.defineProperty(target, key, r), r;
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.SecurityModule = void 0;
const jwt_1 = require("@nestjs/jwt");
const typeorm_1 = require("@nestjs/typeorm");
const common_1 = require("@nestjs/common");
const passport_1 = require("@nestjs/passport");
const credential_entity_1 = require("./data/entity/credential.entity");
const token_entity_1 = require("./data/entity/token.entity");
const user_entity_1 = require("@model/User/entities/user.entity");
const security_controller_1 = require("./security.controller");
const service_1 = require("./service");
const config_1 = require("@common/config");
const enum_1 = require("@common/config/enum");
const guards_1 = require("./guards");
const core_1 = require("@nestjs/core");
const jwt_strategy_1 = require("./strategy/jwt.strategy");
const roles_guard_1 = require("./guards/roles.guard");
const google_strategy_1 = require("./strategy/google.strategy");
const mail_module_1 = require("@common/services/mail.module");
let SecurityModule = class SecurityModule {
};
exports.SecurityModule = SecurityModule;
exports.SecurityModule = SecurityModule = __decorate([
    (0, common_1.Module)({
        imports: [
            typeorm_1.TypeOrmModule.forFeature([credential_entity_1.Credential, token_entity_1.Token, user_entity_1.User]),
            jwt_1.JwtModule.register({
                global: true,
                secret: config_1.configManager.getValue(enum_1.ConfigKey.JWT_TOKEN_SECRET),
                signOptions: { expiresIn: config_1.configManager.getValue(enum_1.ConfigKey.JWT_TOKEN_EXPIRE_IN) },
            }),
            passport_1.PassportModule.register({ defaultStrategy: 'jwt' }),
            mail_module_1.MailModule,
        ],
        exports: [service_1.SecurityService, roles_guard_1.RolesGuard],
        providers: [
            service_1.SecurityService,
            service_1.TokenService,
            guards_1.JwtGuard,
            jwt_1.JwtService,
            core_1.Reflector,
            jwt_strategy_1.JwtStrategy,
            roles_guard_1.RolesGuard,
            google_strategy_1.GoogleStrategy,
        ],
        controllers: [security_controller_1.SecurityController],
    })
], SecurityModule);
//# sourceMappingURL=security.module.js.map