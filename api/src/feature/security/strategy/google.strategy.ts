import { Injectable } from '@nestjs/common';
import { PassportStrategy } from '@nestjs/passport';
import { Strategy, VerifyCallback } from 'passport-google-oauth20';
import { SecurityService } from '../service/security.service';

/**
 * Stratégie Passport pour l'authentification Google OAuth2
 * On utilise process.env directement pour éviter les erreurs de typage avec configManager
 */
@Injectable()
export class GoogleStrategy extends PassportStrategy(Strategy, 'google') {
  constructor(private readonly securityService: SecurityService) {
    
    // DEBUG: Affichage des variables d'environnement Google OAuth (à activer uniquement en développement)
    if (!process.env.GOOGLE_CLIENT_ID || !process.env.GOOGLE_CLIENT_SECRET || !process.env.GOOGLE_CALLBACK_URL) {
      throw new Error('Google OAuth env variables are missing!');
    }
    super({
      clientID: process.env.GOOGLE_CLIENT_ID,
      clientSecret: process.env.GOOGLE_CLIENT_SECRET,
      callbackURL: process.env.GOOGLE_CALLBACK_URL,
      scope: ['email', 'profile'],
    });
  }

  /**
   * Méthode appelée après validation Google
   * @param accessToken Token d'accès Google
   * @param refreshToken Token de rafraîchissement Google
   * @param profile Profil Google de l'utilisateur
   * @param done Callback pour retourner l'utilisateur
   */
  async validate(accessToken: string, refreshToken: string, profile: any, done: VerifyCallback): Promise<any> {
    const { emails, displayName, id } = profile;
    const email = emails[0].value;

    try {
      // On cherche d'abord si l'utilisateur existe déjà
      const existingUser = await this.securityService.findByEmail(email);
      
      if (existingUser) {
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

      // Si l'utilisateur n'existe pas, on le crée
      const newUser = await this.securityService.createFromGoogle({
        email,
        displayName,
        googleId: id,
      });

      return done(null, {
        id: newUser.id,
        email: newUser.email,
        nom: newUser.nom,
        prenom: newUser.prenom,
        googleId: id,
        accessToken,
      });
    } catch (error) {
      return done(error, false);
    }
  }
} 