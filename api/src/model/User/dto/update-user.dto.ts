import { PartialType, OmitType } from '@nestjs/mapped-types';
import { CreateUserDto } from './create-user.dto';
import { Matches, IsOptional, IsString, MinLength } from 'class-validator';

/**
 * DTO pour la mise à jour d'un utilisateur (tous les champs sont optionnels)
 * Le mot de passe est optionnel lors de la mise à jour
 */
export class UpdateUserDto extends PartialType(OmitType(CreateUserDto, ['password'] as const)) {
  @IsOptional()
  @IsString()
  @MinLength(6, { message: 'Le mot de passe doit contenir au moins 6 caractères' })
  password?: string;

  // Validation stricte : numéro belge (0492390824 ou +32492390824)
  @IsOptional()
  @Matches(/^(0[1-9][0-9]{8}|(\+32)[1-9][0-9]{8})$/, {
    message: 'Le numéro de téléphone doit être belge (ex: 0492390824 ou +32492390824)'
  })
  telephone?: string;
} 