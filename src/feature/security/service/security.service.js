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
var SecurityService_1;
Object.defineProperty(exports, "__esModule", { value: true });
exports.SecurityService = void 0;
const common_1 = require("@nestjs/common");
const typeorm_1 = require("@nestjs/typeorm");
const typeorm_2 = require("typeorm");
const token_service_1 = require("./token.service");
const data_1 = require("../data");
const security_exception_1 = require("../security.exception");
const user_entity_1 = require("@model/User/entities/user.entity");
const user_role_enum_1 = require("@model/User/entities/user-role.enum");
const builder_pattern_1 = require("builder-pattern");
const lodash_1 = require("lodash");
const ulid_1 = require("ulid");
const utils_1 = require("../utils");
const api_exception_1 = require("@common/config/api/model/api.exception");
const config_1 = require("@common/config");
const mail_service_1 = require("@common/services/mail.service");
const uuid_1 = require("uuid");
console.log('=== FICHIER SECURITY.SERVICE.TS CHARGÉ ===');
class InvalidPasswordException extends api_exception_1.ApiException {
    constructor() {
        super(config_1.ApiCodeResponse.PAYLOAD_IS_NOT_VALID, 401);
    }
}
let SecurityService = SecurityService_1 = class SecurityService {
    constructor(repository, userRepository, tokenService, mailService) {
        this.repository = repository;
        this.userRepository = userRepository;
        this.tokenService = tokenService;
        this.mailService = mailService;
        this.logger = new common_1.Logger(SecurityService_1.name);
        this.loginAttempts = new Map();
        this.MAX_ATTEMPTS = 5;
        this.LOCK_TIME = 15 * 60 * 1000;
    }
    checkLoginAttempts(username) {
        const attempts = this.loginAttempts.get(username);
        if (attempts && attempts.count >= this.MAX_ATTEMPTS) {
            const timePassed = Date.now() - attempts.lastAttempt.getTime();
            if (timePassed < this.LOCK_TIME) {
                throw new Error('Account temporarily locked. Try again later.');
            }
            this.loginAttempts.delete(username);
        }
        return true;
    }
    async detail(id) {
        const result = await this.repository.findOne({ where: { credential_id: id } });
        if (!(0, lodash_1.isNil)(result)) {
            return result;
        }
        throw new security_exception_1.UserNotFoundException();
    }
    async signIn(payload, isAdmin) {
        try {
            this.logger.log(`🔐 Tentative de connexion avec: ${payload.username}`);
            let credential;
            if (payload.socialLogin && (payload.googleHash || payload.facebookHash)) {
                this.logger.log(`🔐 Tentative de connexion sociale avec: ${payload.username}`);
                credential = await this.repository
                    .createQueryBuilder('credential')
                    .where('credential.mail = :email', { email: payload.username })
                    .andWhere('(credential.googleHash = :googleHash OR credential.facebookHash = :facebookHash)', {
                    googleHash: payload.googleHash || '',
                    facebookHash: payload.facebookHash || ''
                })
                    .getOne();
                if (!credential) {
                    this.logger.warn(`❌ Utilisateur social non trouvé: ${payload.username}`);
                    throw new security_exception_1.UserNotFoundException();
                }
            }
            else {
                credential = await this.repository
                    .createQueryBuilder('credential')
                    .where('credential.mail = :identifier OR credential.username = :identifier', {
                    identifier: payload.username
                })
                    .getOne();
                if (!credential) {
                    throw new security_exception_1.UserNotFoundException();
                }
            }
            const user = await this.userRepository.findOne({
                where: { email: credential.mail }
            });
            if (!user || !user.isActive) {
                throw new common_1.UnauthorizedException({
                    statusCode: 401,
                    code: 'USER_INACTIVE',
                    message: 'Votre compte est inactif. Veuillez contacter un administrateur pour le réactiver.'
                });
            }
            if (user && user.type_user === user_role_enum_1.UserRole.VISITOR) {
                user.type_user = user_role_enum_1.UserRole.MEMBER;
                await this.userRepository.save(user);
                this.logger.log(`✅ Utilisateur promu automatiquement en MEMBER: ${user.email}`);
            }
            if (isAdmin && !credential.isAdmin) {
                throw new common_1.UnauthorizedException('Admin access required');
            }
            await this.validateAndGenerateTokens(credential, payload);
            this.logger.log(`✅ Connexion réussie pour: ${credential.username}`);
            return this.tokenService.getTokens(credential);
        }
        catch (error) {
            this.logger.error(`❌ Échec de connexion: ${error.message}`);
            throw error;
        }
    }
    async signup(payload, isAdmin = false) {
        try {
            const existingEmail = await this.repository.findOneBy({ mail: payload.mail });
            if (existingEmail) {
                this.logger.warn(`❌ Email déjà utilisé: ${payload.mail}`);
                throw new security_exception_1.UserAlreadyExistException();
            }
            const existingUsername = await this.repository.findOneBy({ username: payload.username });
            if (existingUsername) {
                this.logger.warn(`❌ Nom d'utilisateur déjà pris: ${payload.username}`);
                throw new security_exception_1.UserAlreadyExistException();
            }
            const hashedPassword = await (0, utils_1.encryptPassword)(payload.password);
            const newCredential = await this.repository.save({
                credential_id: (0, ulid_1.ulid)(),
                username: payload.username,
                password: hashedPassword,
                mail: payload.mail,
                isAdmin: isAdmin,
                googleHash: '',
                facebookHash: '',
                active: true
            });
            const newUser = this.userRepository.create({
                email: payload.mail,
                password: hashedPassword,
                nom: payload.nom,
                prenom: payload.prenom,
                entreprise: payload.entreprise,
                type_user: isAdmin ? user_role_enum_1.UserRole.ADMIN : user_role_enum_1.UserRole.MEMBER,
                photo: '/api/files/profiles/default.jpg',
            });
            try {
                const savedUser = await this.userRepository.save(newUser);
                this.logger.log(`✅ User créé dans la table users: ${newUser.email} avec le rôle: ${savedUser.type_user}`);
            }
            catch (error) {
                await this.repository.remove(newCredential);
                throw error;
            }
            this.logger.log(`✅ Utilisateur créé: ${newCredential.username}`);
            return this.tokenService.getTokens(newCredential);
        }
        catch (error) {
            this.logger.error(`❌ Erreur création utilisateur: ${error.message}`);
            throw error;
        }
    }
    async refresh(payload) {
        return this.tokenService.refresh(payload);
    }
    async delete(id) {
        try {
            const detail = await this.detail(id);
            await this.tokenService.deleteFor(detail);
            detail.active = false;
            await this.repository.save(detail);
            const user = await this.userRepository.findOne({
                where: { email: detail.mail }
            });
            if (user) {
                user.isActive = false;
                await this.userRepository.save(user);
            }
        }
        catch (e) {
            throw new security_exception_1.CredentialDeleteException();
        }
    }
    async findBySocialLogin(payload, isAdmin) {
        if (payload.googleHash) {
            const user = await this.repository.findOneBy({
                googleHash: payload.googleHash,
                isAdmin: isAdmin
            });
            if (!user)
                throw new security_exception_1.UserNotFoundException();
            return user;
        }
        throw new security_exception_1.UserNotFoundException();
    }
    async findByCredentials(payload, isAdmin) {
        const user = await this.repository
            .createQueryBuilder('credential')
            .where('(credential.mail = :identifier OR credential.username = :identifier)', {
            identifier: payload.username
        })
            .getOne();
        if (!user) {
            this.logger.warn(`❌ Utilisateur non trouvé avec l'identifiant: ${payload.username}`);
            throw new security_exception_1.UserNotFoundException();
        }
        if (isAdmin && !user.isAdmin) {
            this.logger.warn(`❌ L'utilisateur ${user.username} n'est pas un administrateur`);
            throw new security_exception_1.UserNotFoundException();
        }
        this.logger.debug(`👤 Utilisateur trouvé: ${user.username} (${user.mail})`);
        return user;
    }
    async debugUserSearch(username) {
        const allUsers = await this.repository.find();
        this.logger.debug('🔍 Utilisateurs en base:');
        allUsers.forEach(user => {
            this.logger.debug(`- ${user.username} (${user.mail}) [${user.isAdmin ? 'admin' : 'membre'}]`);
        });
    }
    async validateAndGenerateTokens(user, payload) {
        if (!user.password || !(payload.socialLogin || await (0, utils_1.comparePassword)(payload.password, user.password))) {
            this.logger.warn(`🚫 Mot de passe erroné pour: ${user.username}`);
            throw new InvalidPasswordException();
        }
        this.logger.debug(`✅ Validation OK pour: ${user.username}`);
    }
    async userExists(username) {
        const user = await this.repository.findOneBy({ username });
        return !!user;
    }
    async createUser(payload, isAdmin) {
        const encryptedPassword = (!payload.googleHash && !payload.facebookHash)
            ? await (0, utils_1.encryptPassword)(payload.password)
            : '';
        return await this.repository.save((0, builder_pattern_1.Builder)()
            .credential_id((0, ulid_1.ulid)())
            .username(payload.username)
            .password(encryptedPassword)
            .googleHash(payload.googleHash || '')
            .facebookHash(payload.facebookHash || '')
            .mail(payload.mail)
            .isAdmin(isAdmin)
            .build());
    }
    async promoteToOrganizer(userId) {
        const user = await this.userRepository.findOne({
            where: { id: userId }
        });
        if (!user) {
            throw new security_exception_1.UserNotFoundException();
        }
        user.type_user = user_role_enum_1.UserRole.ORGANIZER;
        await this.userRepository.save(user);
        this.logger.log(`✅ Utilisateur promu en ORGANIZER: ${user.email}`);
    }
    async fixAdminRole(userId) {
        const user = await this.userRepository.findOne({
            where: { id: userId }
        });
        if (user) {
            const credential = await this.repository.findOne({
                where: { mail: user.email }
            });
            if ((credential === null || credential === void 0 ? void 0 : credential.isAdmin) && user.type_user !== user_role_enum_1.UserRole.ADMIN) {
                user.type_user = user_role_enum_1.UserRole.ADMIN;
                await this.userRepository.save(user);
                this.logger.log(`✅ Rôle admin corrigé pour: ${user.email}`);
            }
        }
    }
    async checkUserRole(userId) {
        const user = await this.userRepository.findOne({
            where: { id: userId },
            select: ['id', 'email', 'type_user']
        });
        if (user) {
            this.logger.log(`👤 Utilisateur ${user.email} a le rôle: ${user.type_user}`);
        }
    }
    async promoteToMember(userId) {
        const user = await this.userRepository.findOne({
            where: { id: userId }
        });
        if (!user) {
            throw new security_exception_1.UserNotFoundException();
        }
        user.type_user = user_role_enum_1.UserRole.MEMBER;
        await this.userRepository.save(user);
        this.logger.log(`✅ Utilisateur promu en MEMBER: ${user.email}`);
    }
    async promoteToAdmin(userId) {
        const user = await this.userRepository.findOne({
            where: { id: userId }
        });
        if (!user) {
            throw new security_exception_1.UserNotFoundException();
        }
        user.type_user = user_role_enum_1.UserRole.ADMIN;
        await this.userRepository.save(user);
        const credential = await this.repository.findOne({
            where: { mail: user.email }
        });
        if (credential) {
            credential.isAdmin = true;
            await this.repository.save(credential);
        }
        this.logger.log(`✅ Utilisateur promu en ADMIN: ${user.email}`);
    }
    async remove(id) {
        const user = await this.userRepository.findOne({ where: { id } });
        if (!user)
            throw new common_1.NotFoundException(`User with ID ${id} not found`);
        user.isActive = false;
        await this.userRepository.save(user);
        const credential = await this.repository.findOne({ where: { mail: user.email } });
        if (credential) {
            credential.active = false;
            await this.repository.save(credential);
        }
    }
    async restore(id) {
        this.logger.log(`Tentative de restauration pour ID: ${id}`);
        const user = await this.userRepository.findOne({ where: { id } });
        if (!user) {
            throw new common_1.NotFoundException(`User with ID ${id} not found`);
        }
        if (user.isActive) {
            throw new Error('Utilisateur déjà actif');
        }
        user.isActive = true;
        await this.userRepository.save(user);
        this.logger.log(`Utilisateur réactivé: ${user.email}`);
        const credential = await this.repository.findOne({ where: { mail: user.email } });
        if (credential) {
            credential.active = true;
            await this.repository.save(credential);
            this.logger.log(`Credential réactivé pour: ${user.email}`);
        }
        try {
            await this.mailService.sendMail(user.email, 'Compte restauré', 'Votre compte a été restauré par un administrateur. Vous pouvez maintenant vous reconnecter.');
            this.logger.log(`Mail de restauration envoyé à: ${user.email}`);
        }
        catch (error) {
            this.logger.error(`Erreur lors de l'envoi de l'email de restauration: ${error.message}`);
        }
    }
    async findByEmail(email) {
        return this.userRepository.findOne({ where: { email } });
    }
    async createFromGoogle(data) {
        const [prenom, ...nomParts] = data.displayName.split(' ');
        const nom = nomParts.join(' ');
        const user = this.userRepository.create({
            email: data.email,
            nom,
            prenom,
            password: '',
            type_user: user_role_enum_1.UserRole.MEMBER,
            isActive: true,
        });
        return this.userRepository.save(user);
    }
    async generateToken(userData) {
        try {
            let user = await this.findByEmail(userData.email);
            if (!user) {
                user = await this.createFromGoogle(userData);
            }
            else if (!user.isActive) {
                throw new common_1.ForbiddenException('Utilisateur désactivé. Veuillez contacter un administrateur.');
            }
            let credential = await this.repository.findOne({ where: { mail: user.email } });
            if (!credential) {
                credential = await this.repository.save({
                    credential_id: (0, ulid_1.ulid)(),
                    username: user.email,
                    mail: user.email,
                    googleHash: userData.googleId,
                    isAdmin: false,
                    active: true
                });
            }
            return this.tokenService.getTokens(credential);
        }
        catch (error) {
            this.logger.error(`Erreur lors de la génération du token Google: ${error.message}`);
            throw error;
        }
    }
    async requestPasswordReset(email) {
        const credential = await this.repository.findOne({ where: { mail: email } });
        if (!credential)
            throw new common_1.NotFoundException('Email non trouvé');
        const token = (0, uuid_1.v4)();
        credential.resetToken = token;
        credential.resetTokenExpires = new Date(Date.now() + 3600 * 1000);
        await this.repository.save(credential);
        const resetLink = `http://localhost:4200/auth/reset-password/${token}`;
        console.log('Lien de reset envoyé :', resetLink);
        await this.mailService.sendMail(email, 'Réinitialisation du mot de passe', `Cliquez sur ce lien pour réinitialiser votre mot de passe : ${resetLink}`, `<p>Cliquez sur ce lien pour réinitialiser votre mot de passe : <a href="${resetLink}">${resetLink}</a></p>`);
        this.logger.log(`Lien de réinitialisation envoyé à ${email}`);
    }
    async resetPassword(token, newPassword) {
        const credential = await this.repository.findOne({ where: { resetToken: token } });
        if (!credential || !credential.resetTokenExpires || credential.resetTokenExpires < new Date()) {
            throw new common_1.BadRequestException('Token invalide ou expiré');
        }
        credential.password = await (0, utils_1.encryptPassword)(newPassword);
        credential.resetToken = null;
        credential.resetTokenExpires = null;
        await this.repository.save(credential);
        this.logger.log(`Mot de passe réinitialisé pour ${credential.mail}`);
    }
};
exports.SecurityService = SecurityService;
exports.SecurityService = SecurityService = SecurityService_1 = __decorate([
    (0, common_1.Injectable)(),
    __param(0, (0, typeorm_1.InjectRepository)(data_1.Credential)),
    __param(1, (0, typeorm_1.InjectRepository)(user_entity_1.User)),
    __metadata("design:paramtypes", [typeorm_2.Repository,
        typeorm_2.Repository,
        token_service_1.TokenService,
        mail_service_1.MailService])
], SecurityService);
//# sourceMappingURL=security.service.js.map