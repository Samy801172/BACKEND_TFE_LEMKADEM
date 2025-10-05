import { ApiProperty } from '@nestjs/swagger';
import { IsString, IsOptional, IsEmail } from 'class-validator';

export class AccountDto {
  @ApiProperty({ description: 'The account email' })
  @IsEmail()
  email: string;

  @ApiProperty({ description: 'The account password' })
  @IsString()
  password: string;

  @ApiProperty({ description: 'The account first name' })
  @IsString()
  firstName: string;

  @ApiProperty({ description: 'The account last name' })
  @IsString()
  lastName: string;

  @ApiProperty({ description: 'The account phone number', required: false })
  @IsString()
  @IsOptional()
  phoneNumber?: string;
}

export class AccountResponseDto {
  @ApiProperty()
  id: string;

  @ApiProperty()
  email: string;

  @ApiProperty()
  firstName: string;

  @ApiProperty()
  lastName: string;

  @ApiProperty({ required: false })
  phoneNumber?: string;
} 