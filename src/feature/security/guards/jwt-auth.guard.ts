import { Injectable, ExecutionContext, UnauthorizedException, Logger } from '@nestjs/common';
import { AuthGuard } from '@nestjs/passport';
import { ConfigService } from '@nestjs/config';
import { TokenExpiredError } from 'jsonwebtoken';

@Injectable()
export class JwtAuthGuard extends AuthGuard('jwt') {
  private readonly logger = new Logger(JwtAuthGuard.name);

  constructor(private configService: ConfigService) {
    super();
  }

  canActivate(context: ExecutionContext) {
    const request = context.switchToHttp().getRequest();
    // this.logger.debug('Token reçu:', request.headers.authorization?.substring(0, 20) + '...');
    return super.canActivate(context);
  }

  handleRequest(err, user, info: Error) {
    if (info instanceof TokenExpiredError) {
      // this.logger.error('Token expiré');
      throw new UnauthorizedException('Token expired');
    }
    if (err) {
      // this.logger.error('Erreur de validation:', err.message);
      throw new UnauthorizedException('Invalid token');
    }
    if (!user) {
      // this.logger.error('Aucun utilisateur trouvé dans le token');
      throw new UnauthorizedException('Invalid token');
    }
    // this.logger.debug('Token validé pour utilisateur:', user.username);
    return user;
  }
} 