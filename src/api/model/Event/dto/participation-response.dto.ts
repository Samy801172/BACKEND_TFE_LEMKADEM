import { EventParticipation } from '../entities/event-participation.entity';

export interface ParticipationResponseDto {
  message: string;
  participation: EventParticipation;
} 