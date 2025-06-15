import { PartialType } from '@nestjs/mapped-types';
import { CreateUserDto } from './create-user.dto';
import { Matches } from 'class-validator';

/**
 * DTO pour la mise à jour d'un utilisateur (tous les champs sont optionnels)
 * Hérite de CreateUserDto via PartialType
 */
export class UpdateUserDto extends PartialType(CreateUserDto) {
  // Validation stricte : numéro belge (0492390824 ou +32492390824)
  @Matches(/^(0[1-9][0-9]{8}|(\+32)[1-9][0-9]{8})$/, {
    message: 'Le numéro de téléphone doit être belge (ex: 0492390824 ou +32492390824)'
  })
  telephone?: string;
} 