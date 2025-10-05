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
var __param = (this && this.__param) || function (paramIndex, decorator) {
    return function (target, key) { decorator(target, key, paramIndex); }
};
var JwtStrategy_1;
Object.defineProperty(exports, "__esModule", { value: true });
exports.JwtStrategy = void 0;
const common_1 = require("@nestjs/common");
const passport_1 = require("@nestjs/passport");
const passport_jwt_1 = require("passport-jwt");
const config_1 = require("@common/config");
const enum_1 = require("@common/config/enum");
const typeorm_1 = require("@nestjs/typeorm");
const typeorm_2 = require("typeorm");
const user_entity_1 = require("@model/User/entities/user.entity");
const credential_entity_1 = require("../data/entity/credential.entity");
let JwtStrategy = JwtStrategy_1 = class JwtStrategy extends (0, passport_1.PassportStrategy)(passport_jwt_1.Strategy) {
    constructor(userRepository, credentialRepository) {
        const secret = config_1.configManager.getValue(enum_1.ConfigKey.JWT_TOKEN_SECRET);
        if (!secret) {
        }
        super({
            jwtFromRequest: passport_jwt_1.ExtractJwt.fromAuthHeaderAsBearerToken(),
            ignoreExpiration: false,
            secretOrKey: secret,
        });
        this.userRepository = userRepository;
        this.credentialRepository = credentialRepository;
        this.logger = new common_1.Logger(JwtStrategy_1.name);
        this.logger.debug('JWT Strategy initialized with secret:', (secret === null || secret === void 0 ? void 0 : secret.substring(0, 10)) + '...');
    }
    async validate(payload) {
        try {
            const credential = await this.credentialRepository.findOne({
                where: { credential_id: payload.sub }
            });
            if (!credential) {
                throw new common_1.UnauthorizedException('Invalid credentials');
            }
            const user = await this.userRepository.findOne({
                where: { email: credential.mail },
                select: ['id', 'type_user', 'email']
            });
            if (!user) {
                throw new common_1.UnauthorizedException('User not found');
            }
            const userData = {
                userId: user.id,
                role: user.type_user.toUpperCase(),
                email: user.email,
                username: credential.username
            };
            return userData;
        }
        catch (error) {
            throw new common_1.UnauthorizedException('Token validation failed');
        }
    }
};
exports.JwtStrategy = JwtStrategy;
exports.JwtStrategy = JwtStrategy = JwtStrategy_1 = __decorate([
    (0, common_1.Injectable)(),
    __param(0, (0, typeorm_1.InjectRepository)(user_entity_1.User)),
    __param(1, (0, typeorm_1.InjectRepository)(credential_entity_1.Credential)),
    __metadata("design:paramtypes", [typeorm_2.Repository,
        typeorm_2.Repository])
], JwtStrategy);
//# sourceMappingURL=jwt.strategy.js.map