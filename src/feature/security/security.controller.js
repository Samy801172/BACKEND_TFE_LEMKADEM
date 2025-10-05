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
Object.defineProperty(exports, "__esModule", { value: true });
exports.SecurityController = void 0;
const common_1 = require("@nestjs/common");
const swagger_1 = require("@nestjs/swagger");
const service_1 = require("./service");
const credential_entity_1 = require("./data/entity/credential.entity");
const payload_1 = require("./data/payload");
const config_1 = require("@common/config");
const roles_guard_1 = require("./guards/roles.guard");
const roles_decorator_1 = require("./decorators/roles.decorator");
const user_role_enum_1 = require("@model/User/entities/user-role.enum");
const jwt_guard_1 = require("./guards/jwt.guard");
const passport_1 = require("@nestjs/passport");
let SecurityController = class SecurityController {
    constructor(service) {
        this.service = service;
    }
    signIn(payload) {
        return this.service.signIn(payload, false);
    }
    adminSignIn(payload) {
        return this.service.signIn(payload, true);
    }
    signUp(payload) {
        return this.service.signup(payload, false);
    }
    adminSignUp(payload) {
        return this.service.signup(payload, true);
    }
    refresh(payload) {
        return this.service.refresh(payload);
    }
    googleSignIn(payload) {
        const googlePayload = Object.assign(Object.assign({}, payload), { socialLogin: true, googleHash: payload.googleHash, facebookHash: '' });
        return this.service.signIn(googlePayload, false);
    }
    googleAdminSignIn(payload) {
        const googlePayload = Object.assign(Object.assign({}, payload), { socialLogin: true, googleHash: payload.googleHash, facebookHash: '' });
        return this.service.signIn(googlePayload, true);
    }
    googleSignUp(payload) {
        const googlePayload = Object.assign(Object.assign({}, payload), { googleHash: payload.googleHash, facebookHash: '' });
        return this.service.signup(googlePayload, false);
    }
    googleAdminSignUp(payload) {
        const googlePayload = Object.assign(Object.assign({}, payload), { googleHash: payload.googleHash, facebookHash: '' });
        return this.service.signup(googlePayload, true);
    }
    me(user) {
        return user;
    }
    delete(credential_id) {
        return this.service.delete(credential_id);
    }
    async promoteUser(userId, body) {
        if (body.role === user_role_enum_1.UserRole.MEMBER) {
            return this.service.promoteToMember(userId);
        }
        else if (body.role === user_role_enum_1.UserRole.ORGANIZER) {
            return this.service.promoteToOrganizer(userId);
        }
        throw new Error('Invalid role');
    }
    async fixAdminRole(userId) {
        return this.service.fixAdminRole(userId);
    }
    async checkRole(userId) {
        return this.service.checkUserRole(userId);
    }
    async promoteToAdmin(userId) {
        await this.service.promoteToAdmin(userId);
        return {
            success: true,
            message: 'L\'utilisateur a été promu administrateur avec succès'
        };
    }
    async checkUserRole(userId) {
        await this.service.checkUserRole(userId);
    }
    async restoreUser(id) {
        console.log('--- [RESTORE] Endpoint appelé avec id:', id);
        await this.service.restore(id);
        console.log('--- [RESTORE] Service terminé pour id:', id);
        return { code: 'api.common.success', result: true };
    }
    async googleAuth() {
        console.log('🔧 [GOOGLE AUTH] Démarrage de l\'authentification Google');
    }
    async googleAuthRedirect(req, res) {
        try {
            console.log('🔧 [GOOGLE REDIRECT] Callback Google reçu');
            console.log('🔧 [GOOGLE REDIRECT] Utilisateur reçu:', req.user);
            if (!req.user) {
                console.error('❌ [GOOGLE REDIRECT] Aucun utilisateur reçu de Google');
                return res.redirect('http://localhost:4200/login?error=no_user');
            }
            const token = await this.service.generateToken(req.user);
            console.log('✅ [GOOGLE REDIRECT] Token généré avec succès');
            const redirectUrl = `http://localhost:4200/auth/google/callback?token=${token.token}`;
            console.log('🔧 [GOOGLE REDIRECT] Redirection vers:', redirectUrl);
            res.redirect(redirectUrl);
        }
        catch (error) {
            console.error('❌ [GOOGLE REDIRECT] Erreur lors du callback:', error);
            res.redirect('http://localhost:4200/login?error=auth_failed');
        }
    }
    async forgotPassword(body) {
        await this.service.requestPasswordReset(body.email);
        return { message: 'Email de réinitialisation envoyé' };
    }
    async resetPassword(body) {
        console.log('Corps reçu pour reset password :', body);
        if (!body.token || !body.password) {
            throw new common_1.BadRequestException('Token et mot de passe requis');
        }
        await this.service.resetPassword(body.token, body.password);
        return { message: 'Mot de passe réinitialisé' };
    }
};
exports.SecurityController = SecurityController;
__decorate([
    (0, config_1.Public)(),
    (0, common_1.Post)('signin'),
    (0, swagger_1.ApiOperation)({ summary: 'Connexion utilisateur' }),
    (0, swagger_1.ApiResponse)({ status: 200, description: 'Connexion réussie' }),
    (0, swagger_1.ApiResponse)({ status: 401, description: 'Identifiants invalides ou compte inactif' }),
    __param(0, (0, common_1.Body)()),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [payload_1.SignInPayload]),
    __metadata("design:returntype", Promise)
], SecurityController.prototype, "signIn", null);
__decorate([
    (0, config_1.Public)(),
    (0, common_1.Post)('admin-signin'),
    (0, swagger_1.ApiOperation)({ summary: 'Connexion administrateur' }),
    (0, swagger_1.ApiResponse)({ status: 200, description: 'Connexion admin réussie' }),
    (0, swagger_1.ApiResponse)({ status: 401, description: 'Identifiants invalides ou compte inactif' }),
    __param(0, (0, common_1.Body)()),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [payload_1.SignInPayload]),
    __metadata("design:returntype", Promise)
], SecurityController.prototype, "adminSignIn", null);
__decorate([
    (0, config_1.Public)(),
    (0, common_1.Post)('signup'),
    __param(0, (0, common_1.Body)()),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [payload_1.SignupPayload]),
    __metadata("design:returntype", Promise)
], SecurityController.prototype, "signUp", null);
__decorate([
    (0, config_1.Public)(),
    (0, common_1.Post)('admin-signup'),
    __param(0, (0, common_1.Body)()),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [payload_1.SignupPayload]),
    __metadata("design:returntype", Promise)
], SecurityController.prototype, "adminSignUp", null);
__decorate([
    (0, config_1.Public)(),
    (0, common_1.Post)('refresh'),
    __param(0, (0, common_1.Body)()),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [Object]),
    __metadata("design:returntype", Promise)
], SecurityController.prototype, "refresh", null);
__decorate([
    (0, config_1.Public)(),
    (0, common_1.Post)('google/signin'),
    __param(0, (0, common_1.Body)()),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [payload_1.SignInPayload]),
    __metadata("design:returntype", Promise)
], SecurityController.prototype, "googleSignIn", null);
__decorate([
    (0, config_1.Public)(),
    (0, common_1.Post)('google/admin-signin'),
    __param(0, (0, common_1.Body)()),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [payload_1.SignInPayload]),
    __metadata("design:returntype", Promise)
], SecurityController.prototype, "googleAdminSignIn", null);
__decorate([
    (0, config_1.Public)(),
    (0, common_1.Post)('google/signup'),
    __param(0, (0, common_1.Body)()),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [payload_1.SignupPayload]),
    __metadata("design:returntype", Promise)
], SecurityController.prototype, "googleSignUp", null);
__decorate([
    (0, config_1.Public)(),
    (0, common_1.Post)('google/admin-signup'),
    __param(0, (0, common_1.Body)()),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [payload_1.SignupPayload]),
    __metadata("design:returntype", Promise)
], SecurityController.prototype, "googleAdminSignUp", null);
__decorate([
    (0, common_1.Get)('me'),
    __param(0, (0, config_1.User)()),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [credential_entity_1.Credential]),
    __metadata("design:returntype", credential_entity_1.Credential)
], SecurityController.prototype, "me", null);
__decorate([
    (0, common_1.Delete)('delete/:id'),
    __param(0, (0, common_1.Param)('id')),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [String]),
    __metadata("design:returntype", Promise)
], SecurityController.prototype, "delete", null);
__decorate([
    (0, common_1.Patch)('promote/:id'),
    (0, common_1.UseGuards)(roles_guard_1.RolesGuard),
    (0, roles_decorator_1.Roles)(user_role_enum_1.UserRole.ADMIN),
    (0, swagger_1.ApiOperation)({ summary: 'Promouvoir un utilisateur' }),
    __param(0, (0, common_1.Param)('id')),
    __param(1, (0, common_1.Body)()),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [String, Object]),
    __metadata("design:returntype", Promise)
], SecurityController.prototype, "promoteUser", null);
__decorate([
    (0, common_1.Patch)('fix-role/:id'),
    (0, config_1.Public)(),
    (0, swagger_1.ApiOperation)({ summary: 'Corriger le rôle d\'un utilisateur admin' }),
    __param(0, (0, common_1.Param)('id')),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [String]),
    __metadata("design:returntype", Promise)
], SecurityController.prototype, "fixAdminRole", null);
__decorate([
    (0, common_1.Get)('check-role/:id'),
    (0, config_1.Public)(),
    (0, swagger_1.ApiOperation)({ summary: 'Vérifier le rôle d\'un utilisateur' }),
    __param(0, (0, common_1.Param)('id')),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [String]),
    __metadata("design:returntype", Promise)
], SecurityController.prototype, "checkRole", null);
__decorate([
    (0, common_1.Post)('promote-to-admin/:userId'),
    (0, roles_decorator_1.Roles)(user_role_enum_1.UserRole.ADMIN),
    (0, common_1.UseGuards)(roles_guard_1.RolesGuard),
    (0, swagger_1.ApiOperation)({ summary: 'Promouvoir un utilisateur en administrateur' }),
    (0, swagger_1.ApiResponse)({ status: 200, description: 'L\'utilisateur a été promu avec succès' }),
    __param(0, (0, common_1.Param)('userId')),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [String]),
    __metadata("design:returntype", Promise)
], SecurityController.prototype, "promoteToAdmin", null);
__decorate([
    (0, common_1.Get)('check-role/:userId'),
    (0, roles_decorator_1.Roles)(user_role_enum_1.UserRole.ADMIN),
    (0, swagger_1.ApiOperation)({ summary: 'Vérifier le rôle d\'un utilisateur' }),
    __param(0, (0, common_1.Param)('userId')),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [String]),
    __metadata("design:returntype", Promise)
], SecurityController.prototype, "checkUserRole", null);
__decorate([
    (0, common_1.Patch)('restore/:id'),
    (0, common_1.UseGuards)(jwt_guard_1.JwtGuard, roles_guard_1.RolesGuard),
    (0, roles_decorator_1.Roles)(user_role_enum_1.UserRole.ADMIN),
    (0, swagger_1.ApiOperation)({ summary: 'Restaurer un utilisateur désactivé' }),
    __param(0, (0, common_1.Param)('id')),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [String]),
    __metadata("design:returntype", Promise)
], SecurityController.prototype, "restoreUser", null);
__decorate([
    (0, common_1.Get)('google'),
    (0, common_1.UseGuards)((0, passport_1.AuthGuard)('google')),
    (0, config_1.Public)(),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", []),
    __metadata("design:returntype", Promise)
], SecurityController.prototype, "googleAuth", null);
__decorate([
    (0, common_1.Get)('google/redirect'),
    (0, common_1.UseGuards)((0, passport_1.AuthGuard)('google')),
    (0, config_1.Public)(),
    __param(0, (0, common_1.Req)()),
    __param(1, (0, common_1.Res)()),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [Object, Object]),
    __metadata("design:returntype", Promise)
], SecurityController.prototype, "googleAuthRedirect", null);
__decorate([
    (0, config_1.Public)(),
    (0, common_1.Post)('forgot-password'),
    __param(0, (0, common_1.Body)()),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [Object]),
    __metadata("design:returntype", Promise)
], SecurityController.prototype, "forgotPassword", null);
__decorate([
    (0, config_1.Public)(),
    (0, common_1.Post)('reset-password'),
    __param(0, (0, common_1.Body)()),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [Object]),
    __metadata("design:returntype", Promise)
], SecurityController.prototype, "resetPassword", null);
exports.SecurityController = SecurityController = __decorate([
    (0, swagger_1.ApiBearerAuth)('access-token'),
    (0, swagger_1.ApiTags)('Security'),
    (0, common_1.Controller)('security'),
    __metadata("design:paramtypes", [service_1.SecurityService])
], SecurityController);
//# sourceMappingURL=security.controller.js.map