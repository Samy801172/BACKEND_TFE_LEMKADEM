import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { User } from './entities/user.entity';
import { UserService } from './user.service';
import { UserController } from './user.controller';
import { MailModule } from '../../common/services/mail.module';
import { Credential } from '../../feature/security/data/entity/credential.entity';
import { NotFoundException } from '@nestjs/common';
import { ContactService } from '../Contact/contact.service';
import { Contact } from '../Contact/entities/contact.entity';
import { SuggestionsService } from './suggestions.service';
import { NotificationModule } from '../Notification/notification.module';

@Module({
  imports: [TypeOrmModule.forFeature([User, Credential, Contact]), MailModule, NotificationModule],
  providers: [UserService, ContactService, SuggestionsService],
  controllers: [UserController],
  exports: [UserService]
})
export class UserModule {}
