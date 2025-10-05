import { SetMetadata } from '@nestjs/common';
import { UserRole } from '@model/User/entities/user-role.enum';

// Clé utilisée pour stocker les métadonnées des rôles
export const ROLES_KEY = 'roles';

// Décorateur qui accepte un ou plusieurs rôles
export const Roles = (...roles: UserRole[]) => SetMetadata(ROLES_KEY, roles); 