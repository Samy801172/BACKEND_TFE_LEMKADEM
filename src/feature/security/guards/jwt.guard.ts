import { JwtService } from '@nestjs/jwt';
import { from, Observable } from 'rxjs';
import { NoTokenFoundedException, TokenExpiredException } from '../security.exception';
import { Reflector } from '@nestjs/core';
import { IS_PUBLIC_KEY } from '@common/config';
import { isNil } from 'lodash';
import { map } from 'rxjs/operators';
import { Credential } from '@feature/security/data';
import { configManager } from '@common/config';
import { ConfigKey } from '@common/config/enum';

import { CanActivate, ExecutionContext, Injectable, Logger } from '@nestjs/common';
import { SecurityService } from '../service';

/**
 * Guard personnalisé pour la validation des tokens JWT.
 * - Vérifie la présence et la validité du token dans l'en-tête Authorization.
 * - Injecte l'utilisateur enrichi (avec le champ 'role') dans la requête pour les guards de rôle.
 */
@Injectable()
export class JwtGuard implements CanActivate {
  private readonly logger = new Logger(JwtGuard.name);

  constructor(
    private readonly jwtService: JwtService,
    private readonly securityService: SecurityService,
    private reflector: Reflector
  ) {}

  /**
   * Méthode principale appelée par NestJS pour vérifier l'accès à une route.
   * - Si la route est publique, autorise l'accès.
   * - Sinon, valide le token JWT.
   */
  canActivate(context: ExecutionContext): boolean | Promise<boolean> | Observable<boolean> {
    const isPublic = this.reflector.getAllAndOverride<boolean>(IS_PUBLIC_KEY, [
      context.getHandler(),
      context.getClass(),
    ]);
    return isPublic ? true : this.validateToken(context.switchToHttp().getRequest());
  }

  /**
   * Valide le token JWT présent dans l'en-tête Authorization.
   * - Vérifie la présence du token.
   * - Décode et vérifie le token avec le secret JWT.
   * - Récupère l'utilisateur associé et l'injecte dans la requête avec le champ 'role'.
   * - Gère les erreurs de token ou d'absence de token.
   */
  private validateToken(request: any): Observable<boolean> {
    const authHeader = request.headers['authorization'];
    if (!isNil(authHeader)) {
      try {
        // Extraction du token depuis l'en-tête Authorization
        const token = authHeader.replace('Bearer ', '');
        // Récupération du secret JWT depuis la config
        const secret = configManager.getValue(ConfigKey.JWT_TOKEN_SECRET);
        // Vérification et décodage du token
        const decodedToken = this.jwtService.verify(token, { secret });
        const id = decodedToken.sub;
        // Récupération de l'utilisateur associé au token
        return from(this.securityService.detail(id)).pipe(
          map((user: Credential) => {
            // Injection de l'utilisateur enrichi avec le champ 'role' (pour le RolesGuard)
            request.user = {
              ...user,
              role: user.isAdmin ? 'ADMIN' : 'MEMBER',
            };
            return true;
          })
        );
      } catch (e) {
        throw new TokenExpiredException();
      }
    }
    throw new NoTokenFoundedException();
  }
}
