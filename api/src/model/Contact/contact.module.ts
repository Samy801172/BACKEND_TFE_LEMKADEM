import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { Contact } from './entities/contact.entity';
import { ContactService } from './contact.service';
import { ContactController } from './contact.controller';
import { User } from '../User/entities/user.entity';
import { NotificationModule } from '../Notification/notification.module';

@Module({
  imports: [
    TypeOrmModule.forFeature([Contact, User]),
    NotificationModule
  ],
  providers: [ContactService],
  controllers: [ContactController],
  exports: [ContactService]
})
export class ContactModule {} 