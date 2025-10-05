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
var GoogleStrategy_1;
Object.defineProperty(exports, "__esModule", { value: true });
exports.GoogleStrategy = void 0;
const common_1 = require("@nestjs/common");
const passport_1 = require("@nestjs/passport");
const passport_google_oauth20_1 = require("passport-google-oauth20");
const security_service_1 = require("../service/security.service");
let GoogleStrategy = GoogleStrategy_1 = class GoogleStrategy extends (0, passport_1.PassportStrategy)(passport_google_oauth20_1.Strategy, 'google') {
    constructor(securityService) {
        if (!process.env.GOOGLE_CLIENT_ID || !process.env.GOOGLE_CLIENT_SECRET || !process.env.GOOGLE_CALLBACK_URL) {
            throw new Error('Google OAuth env variables are missing!');
        }
        super({
            clientID: process.env.GOOGLE_CLIENT_ID,
            clientSecret: process.env.GOOGLE_CLIENT_SECRET,
            callbackURL: process.env.GOOGLE_CALLBACK_URL,
            scope: ['email', 'profile'],
        });
        this.securityService = securityService;
        this.logger = new common_1.Logger(GoogleStrategy_1.name);
        this.logger.log('🔧 Initialisation Google Strategy...');
        this.logger.log(`🔧 GOOGLE_CLIENT_ID: ${process.env.GOOGLE_CLIENT_ID ? '✅ Présent' : '❌ Manquant'}`);
        this.logger.log(`🔧 GOOGLE_CLIENT_SECRET: ${process.env.GOOGLE_CLIENT_SECRET ? '✅ Présent' : '❌ Manquant'}`);
        this.logger.log(`🔧 GOOGLE_CALLBACK_URL: ${process.env.GOOGLE_CALLBACK_URL || '❌ Manquant'}`);
        this.logger.log('✅ Google Strategy initialisée avec succès');
    }
    async validate(accessToken, refreshToken, profile, done) {
        this.logger.log('🔍 Validation Google OAuth en cours...');
        this.logger.log(`🔍 Profile Google reçu: ${JSON.stringify(profile, null, 2)}`);
        const { emails, displayName, id } = profile;
        const email = emails[0].value;
        try {
            this.logger.log(`🔍 Recherche utilisateur avec email: ${email}`);
            const existingUser = await this.securityService.findByEmail(email);
            if (existingUser) {
                this.logger.log(`✅ Utilisateur existant trouvé: ${existingUser.email}`);
                return done(null, {
                    id: existingUser.id,
                    email: existingUser.email,
                    nom: existingUser.nom,
                    prenom: existingUser.prenom,
                    googleId: id,
                    accessToken,
                });
            }
            this.logger.log(`🆕 Création d'un nouvel utilisateur pour: ${email}`);
            const newUser = await this.securityService.createFromGoogle({
                email,
                displayName,
                googleId: id,
            });
            this.logger.log(`✅ Nouvel utilisateur créé: ${newUser.email}`);
            return done(null, {
                id: newUser.id,
                email: newUser.email,
                nom: newUser.nom,
                prenom: newUser.prenom,
                googleId: id,
                accessToken,
            });
        }
        catch (error) {
            this.logger.error(`❌ Erreur lors de la validation Google: ${error.message}`);
            return done(error, false);
        }
    }
};
exports.GoogleStrategy = GoogleStrategy;
exports.GoogleStrategy = GoogleStrategy = GoogleStrategy_1 = __decorate([
    (0, common_1.Injectable)(),
    __metadata("design:paramtypes", [security_service_1.SecurityService])
], GoogleStrategy);
//# sourceMappingURL=google.strategy.js.map