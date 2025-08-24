import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { Document } from './entities/document.entity';
import { DocumentController } from './document.controller';
import { MailModule } from '../../common/services/mail.module';
import { Event } from '../Event/entities/event.entity';
import { EventParticipation } from '../Event/entities/event-participation.entity';

@Module({
  imports: [
    TypeOrmModule.forFeature([Document, Event, EventParticipation]),
    MailModule
  ],
  controllers: [DocumentController],
  providers: [],
  exports: []
})
export class DocumentModule {} 