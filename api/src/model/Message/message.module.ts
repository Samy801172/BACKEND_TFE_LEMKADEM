import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { Message } from './entities/message.entity';
import { MessageService } from './message.service';
import { MessageController } from './message.controller';
import { User } from '../User/entities/user.entity';
import { NotificationModule } from '../Notification/notification.module';

@Module({
  imports: [
    TypeOrmModule.forFeature([Message, User]),
    NotificationModule
  ],
  providers: [MessageService],
  controllers: [MessageController],
  exports: [MessageService]
})
export class MessageModule {} 