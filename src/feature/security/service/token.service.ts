import { Injectable, Logger } from "@nestjs/common";
import { Credential } from "../data/entity/credential.entity";
import { Token } from "../data/entity/token.entity";
import { RefreshTokenPayload } from "../data/payload/refresh-token.payload";
import { JwtService } from "@nestjs/jwt";
import { Repository } from "typeorm";
import { InjectRepository } from "@nestjs/typeorm";
import { configManager } from "@common/config";
import { ConfigKey } from "@common/config/enum";
import { TokenExpiredException, TokenGenerationException } from "../security.exception";
import { ulid } from "ulid";
import { User } from "@model/User/entities/user.entity";

@Injectable()
export class TokenService {
  private readonly logger = new Logger(TokenService.name);

  constructor(
    @InjectRepository(Token) private readonly repository: Repository<Token>,
    @InjectRepository(Credential) private readonly credentialRepository: Repository<Credential>,
    @InjectRepository(User) private readonly userRepository: Repository<User>,
    private jwtService: JwtService
  ) {}

  /**
   * Génère les tokens d'accès et de rafraîchissement
   */
  async getTokens(credential: Credential): Promise<Token> {
    try {
      this.logger.log(`🎟️ Génération tokens pour: ${credential.username}`);
      
      // Supprime les anciens tokens
      await this.deleteFor(credential);
      
      // Récupérer l'utilisateur avec son rôle
      const user = await this.userRepository.findOne({
        where: { email: credential.mail },
        select: ['id', 'email', 'type_user'] // Assurez-vous de sélectionner type_user
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
        userId: user.id, // Ajout de l'ID utilisateur
        role: user.type_user // Utilisation du rôle de l'utilisateur
      };
      
      const [token, refreshToken] = await Promise.all([
        this.jwtService.signAsync(payload, {
          secret: configManager.getValue(ConfigKey.JWT_TOKEN_SECRET),
          expiresIn: configManager.getValue(ConfigKey.JWT_TOKEN_EXPIRE_IN)
        }),
        this.jwtService.signAsync(payload, {
          secret: configManager.getValue(ConfigKey.JWT_REFRESH_TOKEN_SECRET),
          expiresIn: configManager.getValue(ConfigKey.JWT_REFRESH_TOKEN_EXPIRE_IN)
        })
      ]);

      // Crée un nouveau token avec un ID unique
      const newToken = this.repository.create({
        token_id: ulid(),
        token,
        refreshToken,
        credential
      });
      
      const savedToken = await this.repository.save(newToken);
      
      this.logger.log(`✅ Tokens générés pour: ${credential.username} avec rôle: ${user.type_user}`);
      return savedToken;
      
    } catch (error) {
      this.logger.error(`❌ Erreur génération tokens: ${error.message}`);
      throw new TokenGenerationException();
    }
  }

  /**
   * Supprime les tokens existants d'un utilisateur
   */
  async deleteFor(credential: Credential): Promise<void> {
    try {
      await this.repository.delete({ credential });
    } catch (error) {
      this.logger.warn(`⚠️ Erreur suppression tokens: ${error.message}`);
      // Continue même si la suppression échoue
    }
  }

  /**
   * Rafraîchit le token d'accès
   */
  async refresh(payload: RefreshTokenPayload): Promise<Token> {
    try {
      const decoded = this.jwtService.verify(payload.refreshToken, {
        secret: configManager.getValue(ConfigKey.JWT_REFRESH_TOKEN_SECRET)
      });
      
      const credential = await this.credentialRepository.findOneBy({
        credential_id: decoded.sub
      });
      
      if (!credential) {
        throw new TokenExpiredException();
      }

      return this.getTokens(credential);
    } catch (error) {
      this.logger.error(`❌ Erreur refresh: ${error.message}`);
      throw new TokenExpiredException();
    }
  }
}
