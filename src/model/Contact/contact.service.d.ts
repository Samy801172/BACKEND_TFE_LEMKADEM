import { Repository } from 'typeorm';
import { Contact } from './entities/contact.entity';
import { User } from '../User/entities/user.entity';
import { NotificationService } from '../../common/services/notification.service';
export declare class ContactService {
    private readonly contactRepository;
    private readonly userRepository;
    private readonly notificationService;
    constructor(contactRepository: Repository<Contact>, userRepository: Repository<User>, notificationService: NotificationService);
    sendContactRequest(ownerId: string, contactId: string): Promise<Contact>;
    acceptContactRequest(userId: string, requestId: string): Promise<Contact>;
    refuseContactRequest(userId: string, requestId: string): Promise<Contact>;
    getContacts(ownerId: string): Promise<Contact[]>;
    getPendingRequests(userId: string): Promise<Contact[]>;
    deleteContact(userId: string, relationId: string): Promise<{
        success: boolean;
        message: string;
    }>;
}
