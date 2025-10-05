import { ApiProperty } from '@nestjs/swagger';
import { IsNotEmpty, IsOptional, MinLength } from 'class-validator';

export class SignupPayload {
  @IsNotEmpty()
  @MinLength(6)
  @ApiProperty({ description: 'Username must be at least 6 characters long.' })
  username: string;

  @IsNotEmpty()
  @ApiProperty({ description: 'Password field is required.' })
  password: string;

  @IsNotEmpty()
  @ApiProperty({ description: 'Email field is required.' })
  mail: string;

  @IsNotEmpty()
  @ApiProperty({ description: 'Nom de famille de l\'utilisateur.' })
  nom: string;

  @IsNotEmpty()
  @ApiProperty({ description: 'Prénom de l\'utilisateur.' })
  prenom: string;

  @IsOptional()
  @ApiProperty({ required: false, description: 'Google hash is optional.' })
  googleHash?: string;

  @IsOptional()
  @ApiProperty({ required: false, description: 'Facebook hash is optional.' })
  facebookHash?: string;

  @IsOptional()
  @ApiProperty({ required: false, description: "Nom de l'entreprise de l'utilisateur." })
  entreprise?: string;
}
