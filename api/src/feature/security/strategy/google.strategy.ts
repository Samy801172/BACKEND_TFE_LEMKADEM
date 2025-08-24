import { Injectable, Logger } from '@nestjs/common';
import { PassportStrategy } from '@nestjs/passport';
import { Strategy, VerifyCallback } from 'passport-google-oauth20';
import { SecurityService } from '../service/security.service';

/**
 * Stratégie Passport pour l'authentification Google OAuth2
 * On utilise process.env directement pour éviter les erreurs de typage avec configManager
 */
@Injectable()
export class GoogleStrategy extends PassportStrategy(Strategy, 'google') {
  private readonly logger = new Logger(GoogleStrategy.name);

  constructor(private readonly securityService: SecurityService) {
    // Vérifier les variables d'environnement avant d'appeler super()
    if (!process.env.GOOGLE_CLIENT_ID || !process.env.GOOGLE_CLIENT_SECRET || !process.env.GOOGLE_CALLBACK_URL) {
      throw new Error('Google OAuth env variables are missing!');
    }
    
    // Appeler super() en premier
    super({
      clientID: process.env.GOOGLE_CLIENT_ID,
      clientSecret: process.env.GOOGLE_CLIENT_SECRET,
      callbackURL: process.env.GOOGLE_CALLBACK_URL,
      scope: ['email', 'profile'],
    });
    
    // Maintenant on peut utiliser this.logger
    this.logger.log('🔧 Initialisation Google Strategy...');
    this.logger.log(`🔧 GOOGLE_CLIENT_ID: ${process.env.GOOGLE_CLIENT_ID ? '✅ Présent' : '❌ Manquant'}`);
    this.logger.log(`🔧 GOOGLE_CLIENT_SECRET: ${process.env.GOOGLE_CLIENT_SECRET ? '✅ Présent' : '❌ Manquant'}`);
    this.logger.log(`🔧 GOOGLE_CALLBACK_URL: ${process.env.GOOGLE_CALLBACK_URL || '❌ Manquant'}`);
    this.logger.log('✅ Google Strategy initialisée avec succès');
  }

  /**
   * Méthode appelée après validation Google
   * @param accessToken Token d'accès Google
   * @param refreshToken Token de rafraîchissement Google
   * @param profile Profil Google de l'utilisateur
   * @param done Callback pour retourner l'utilisateur
   */
  async validate(accessToken: string, refreshToken: string, profile: any, done: VerifyCallback): Promise<any> {
    this.logger.log('🔍 Validation Google OAuth en cours...');
    this.logger.log(`🔍 Profile Google reçu: ${JSON.stringify(profile, null, 2)}`);
    
    const { emails, displayName, id } = profile;
    const email = emails[0].value;

    try {
      this.logger.log(`🔍 Recherche utilisateur avec email: ${email}`);
      
      // On cherche d'abord si l'utilisateur existe déjà
      const existingUser = await this.securityService.findByEmail(email);
      
      if (existingUser) {
        this.logger.log(`✅ Utilisateur existant trouvé: ${existingUser.email}`);
        // Si l'utilisateur existe, on le retourne
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
      // Si l'utilisateur n'existe pas, on le crée
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
    } catch (error) {
      this.logger.error(`❌ Erreur lors de la validation Google: ${error.message}`);
      return done(error, false);
    }
  }
} 