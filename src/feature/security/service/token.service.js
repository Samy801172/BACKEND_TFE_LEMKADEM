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
var TokenService_1;
Object.defineProperty(exports, "__esModule", { value: true });
exports.TokenService = void 0;
const common_1 = require("@nestjs/common");
const credential_entity_1 = require("../data/entity/credential.entity");
const token_entity_1 = require("../data/entity/token.entity");
const jwt_1 = require("@nestjs/jwt");
const typeorm_1 = require("typeorm");
const typeorm_2 = require("@nestjs/typeorm");
const config_1 = require("@common/config");
const enum_1 = require("@common/config/enum");
const security_exception_1 = require("../security.exception");
const ulid_1 = require("ulid");
const user_entity_1 = require("@model/User/entities/user.entity");
let TokenService = TokenService_1 = class TokenService {
    constructor(repository, credentialRepository, userRepository, jwtService) {
        this.repository = repository;
        this.credentialRepository = credentialRepository;
        this.userRepository = userRepository;
        this.jwtService = jwtService;
        this.logger = new common_1.Logger(TokenService_1.name);
    }
    async getTokens(credential) {
        try {
            this.logger.log(`🎟️ Génération tokens pour: ${credential.username}`);
            await this.deleteFor(credential);
            const user = await this.userRepository.findOne({
                where: { email: credential.mail },
                select: ['id', 'email', 'type_user']
            });
            if (!user) {
                throw new Error('Utilisateur non trouvé');
            }
            this.logger.debug('Création token pour utilisateur:', {
                id: user.id,
                email: user.email,
                role: user.type_user
            });
            const payload = {
                sub: credential.credential_id,
                username: credential.username,
                email: credential.mail,
                userId: user.id,
                role: user.type_user
            };
            const [token, refreshToken] = await Promise.all([
                this.jwtService.signAsync(payload, {
                    secret: config_1.configManager.getValue(enum_1.ConfigKey.JWT_TOKEN_SECRET),
                    expiresIn: config_1.configManager.getValue(enum_1.ConfigKey.JWT_TOKEN_EXPIRE_IN)
                }),
                this.jwtService.signAsync(payload, {
                    secret: config_1.configManager.getValue(enum_1.ConfigKey.JWT_REFRESH_TOKEN_SECRET),
                    expiresIn: config_1.configManager.getValue(enum_1.ConfigKey.JWT_REFRESH_TOKEN_EXPIRE_IN)
                })
            ]);
            const newToken = this.repository.create({
                token_id: (0, ulid_1.ulid)(),
                token,
                refreshToken,
                credential
            });
            const savedToken = await this.repository.save(newToken);
            this.logger.log(`✅ Tokens générés pour: ${credential.username} avec rôle: ${user.type_user}`);
            return savedToken;
        }
        catch (error) {
            this.logger.error(`❌ Erreur génération tokens: ${error.message}`);
            throw new security_exception_1.TokenGenerationException();
        }
    }
    async deleteFor(credential) {
        try {
            await this.repository.delete({ credential });
        }
        catch (error) {
            this.logger.warn(`⚠️ Erreur suppression tokens: ${error.message}`);
        }
    }
    async refresh(payload) {
        try {
            const decoded = this.jwtService.verify(payload.refreshToken, {
                secret: config_1.configManager.getValue(enum_1.ConfigKey.JWT_REFRESH_TOKEN_SECRET)
            });
            const credential = await this.credentialRepository.findOneBy({
                credential_id: decoded.sub
            });
            if (!credential) {
                throw new security_exception_1.TokenExpiredException();
            }
            return this.getTokens(credential);
        }
        catch (error) {
            this.logger.error(`❌ Erreur refresh: ${error.message}`);
            throw new security_exception_1.TokenExpiredException();
        }
    }
};
exports.TokenService = TokenService;
exports.TokenService = TokenService = TokenService_1 = __decorate([
    (0, common_1.Injectable)(),
    __param(0, (0, typeorm_2.InjectRepository)(token_entity_1.Token)),
    __param(1, (0, typeorm_2.InjectRepository)(credential_entity_1.Credential)),
    __param(2, (0, typeorm_2.InjectRepository)(user_entity_1.User)),
    __metadata("design:paramtypes", [typeorm_1.Repository,
        typeorm_1.Repository,
        typeorm_1.Repository,
        jwt_1.JwtService])
], TokenService);
//# sourceMappingURL=token.service.js.map