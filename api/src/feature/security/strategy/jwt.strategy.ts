import { Injectable, Logger, UnauthorizedException } from '@nestjs/common';
import { PassportStrategy } from '@nestjs/passport';
import { ExtractJwt, Strategy } from 'passport-jwt';
import { configManager } from '@common/config';
import { ConfigKey } from '@common/config/enum';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { User } from '@model/User/entities/user.entity';
import { Credential } from '../data/entity/credential.entity';

@Injectable()
export class JwtStrategy extends PassportStrategy(Strategy) {
  private readonly logger = new Logger(JwtStrategy.name);

  constructor(
    @InjectRepository(User)
    private readonly userRepository: Repository<User>,
    @InjectRepository(Credential)
    private readonly credentialRepository: Repository<Credential>
  ) {
    const secret = configManager.getValue(ConfigKey.JWT_TOKEN_SECRET);
    
    // DEBUG: Affichage du secret JWT utilisé (à activer uniquement en développement)
    if (!secret) {
      // ERREUR: Le secret JWT est undefined ou vide ! (log supprimé pour propreté)
    }
    super({
      jwtFromRequest: ExtractJwt.fromAuthHeaderAsBearerToken(),
      ignoreExpiration: false,
      // Ce secret doit être le même que celui utilisé pour signer l'access token
      secretOrKey: secret,
    });
    
    // Log de la configuration au démarrage
    this.logger.debug('JWT Strategy initialized with secret:', 
      secret?.substring(0, 10) + '...');
  }

  async validate(payload: any) {
    try {
      // DEBUG: Validation du token JWT avec payload (à activer uniquement en développement)
      // 1. Vérification des credentials
      const credential = await this.credentialRepository.findOne({
        where: { credential_id: payload.sub }
      });
      
      if (!credential) {
        // DEBUG: Credentials non trouvés pour l'ID (à activer uniquement en développement)
        throw new UnauthorizedException('Invalid credentials');
      }

      // 2. Vérification de l'utilisateur
      const user = await this.userRepository.findOne({
        where: { email: credential.mail },
        select: ['id', 'type_user', 'email'] // Ajout de email pour le logging
      });
      
      if (!user) {
        // DEBUG: Utilisateur non trouvé pour l'email (à activer uniquement en développement)
        throw new UnauthorizedException('User not found');
      }

      // 3. Construction de l'objet utilisateur retourné
      const userData = { 
        userId: user.id,
        role: user.type_user.toUpperCase(),
        email: user.email,
        username: credential.username
      };

      // DEBUG: Token validé pour utilisateur (à activer uniquement en développement)
      return userData;
      
    } catch (error) {
      // DEBUG: Erreur lors de la validation du token (à activer uniquement en développement)
      throw new UnauthorizedException('Token validation failed');
    }
  }
} 