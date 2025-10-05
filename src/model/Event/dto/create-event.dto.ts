import { ApiProperty } from '@nestjs/swagger';
import { IsNotEmpty, IsString, IsNumber, IsDate, IsOptional, IsUrl, IsEnum, Min, Max, Validate } from 'class-validator';
import { EventType } from '../enums/event-type.enum';
import { Transform } from 'class-transformer';
import { ValidatorConstraint, ValidatorConstraintInterface, ValidationArguments } from 'class-validator';
import { IsFutureDateConstraint, IsNotTooFarInFutureConstraint, IsBusinessHoursConstraint } from './custom-date-validators';

export class CreateEventDto {
  @ApiProperty()
  @IsNotEmpty()
  @IsString()
  title: string;

  @ApiProperty()
  @IsNotEmpty()
  @IsString()
  description: string;

  @ApiProperty()
  @IsNotEmpty()
  @IsString()
  location: string;

  @ApiProperty()
  @IsNotEmpty()
  @Transform(({ value }) => new Date(value))
  @IsDate()
  @Validate(IsFutureDateConstraint)
  @Validate(IsNotTooFarInFutureConstraint)
  @Validate(IsBusinessHoursConstraint)
  date: Date;

  @ApiProperty()
  @IsNotEmpty()
  @IsNumber()
  @Min(0, { message: 'Le prix ne peut pas être négatif' })
  price: number;

  @ApiProperty()
  @IsNotEmpty()
  @IsNumber()
  @Min(1, { message: 'Le nombre minimum de participants est 1' })
  @Max(1000, { message: 'Le nombre maximum de participants est 1000' })
  max_participants: number;

  @ApiProperty({ required: false })
  @IsOptional()
  @IsUrl()
  image_url?: string;

  @ApiProperty({ enum: EventType })
  @IsNotEmpty()
  @IsEnum(EventType)
  type_event: EventType;
} 