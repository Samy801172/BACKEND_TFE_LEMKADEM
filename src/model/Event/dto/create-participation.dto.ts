import { ApiProperty } from '@nestjs/swagger';
import { IsNotEmpty, IsUUID, IsOptional, IsString } from 'class-validator';

export class CreateParticipationDto {
  @ApiProperty()
  @IsNotEmpty()
  @IsUUID()
  eventId: string;

  @ApiProperty()
  @IsNotEmpty()
  @IsUUID()
  participantId: string;

  @IsOptional()
  @IsString()
  paymentIntentId?: string;
} 