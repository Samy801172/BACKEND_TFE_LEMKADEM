import { IsEmail, IsString, IsOptional, IsEnum, IsNotEmpty, Matches } from 'class-validator';
import { ApiProperty } from '@nestjs/swagger';
import { UserRole } from '../entities/user-role.enum';

/**
 * DTO pour la création d'un utilisateur (inscription ou ajout par un admin)
 * Contient les champs obligatoires et optionnels pour un nouveau membre
 */
export class CreateUserDto {
  @IsNotEmpty()
  @IsString()
  @ApiProperty()
  nom: string;

  @IsNotEmpty()
  @IsString()
  @ApiProperty()
  prenom: string;

  @IsNotEmpty()
  @IsEmail()
  @ApiProperty()
  email: string;

  @IsNotEmpty()
  @IsString()
  @ApiProperty()
  password: string;

  @IsEnum(UserRole)
  @ApiProperty({ enum: UserRole, default: UserRole.MEMBER })
  type_user: UserRole = UserRole.MEMBER;

  @IsOptional()
  @IsString()
  // Validation stricte : numéro belge (0492390824 ou +32492390824)
  @Matches(/^(0[1-9][0-9]{8}|(\+32)[1-9][0-9]{8})$/, {
    message: 'Le numéro de téléphone doit être belge (ex: 0492390824 ou +32492390824)'
  })
  @ApiProperty({ required: false })
  telephone?: string;

  @IsOptional()
  @IsString()
  @ApiProperty({ required: false })
  entreprise?: string;

  @IsOptional()
  @IsString()
  @ApiProperty({ required: false })
  secteur?: string;

  @IsOptional()
  @IsString()
  @ApiProperty({ required: false })
  bio?: string;

  @IsOptional()
  @IsString()
  @ApiProperty({ required: false })
  photo?: string;

  @IsOptional()
  @IsString()
  @ApiProperty({ required: false })
  linkedin?: string;
} 