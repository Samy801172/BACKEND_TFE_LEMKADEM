import { Injectable, CanActivate, ExecutionContext, Logger } from '@nestjs/common';
import { Reflector } from '@nestjs/core';
import { UserRole } from '@model/User/entities/user-role.enum';
import { ROLES_KEY } from '../decorators/roles.decorator';

// Le RolesGuard vérifie les permissions des utilisateurs
@Injectable()
export class RolesGuard implements CanActivate {
  private readonly logger = new Logger(RolesGuard.name);

  constructor(private reflector: Reflector) {}

  canActivate(context: ExecutionContext): boolean {
    // Récupère les rôles requis depuis les métadonnées
    const requiredRoles = this.reflector.getAllAndOverride<UserRole[]>(ROLES_KEY, [
      context.getHandler(),
      context.getClass(),
    ]);

    // Si pas de rôles requis, autorise l'accès
    if (!requiredRoles) {
      return true;
    }

    // Récupère l'utilisateur depuis la requête
    const { user } = context.switchToHttp().getRequest();
    
    if (!user) {
      this.logger.warn('Aucun utilisateur trouvé dans la requête');
      return false;
    }
    
    this.logger.debug('User data:', user);
    this.logger.debug('Required roles:', requiredRoles);
    this.logger.debug('User role:', user.role);
    
    // Si l'utilisateur est ADMIN, toujours autoriser l'accès
    if (user.role === UserRole.ADMIN) {
      this.logger.log('✅ Accès autorisé pour ADMIN');
      return true;
    }
    
    // Vérifie si l'utilisateur a l'un des rôles requis (insensible à la casse)
    const hasRole = requiredRoles.some((role) => String(user.role).toUpperCase() === String(role).toUpperCase());
    this.logger.debug('Has required role:', hasRole);

    return hasRole;
  }
} 