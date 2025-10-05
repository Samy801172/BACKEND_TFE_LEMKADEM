import { ContactService } from './contact.service';
export declare class ContactController {
    private readonly contactService;
    constructor(contactService: ContactService);
    addContact(req: any, contactId: string): Promise<import("./entities/contact.entity").Contact>;
    getContacts(req: any): Promise<import("./entities/contact.entity").Contact[]>;
    deleteContact(req: any, relationId: string): Promise<{
        success: boolean;
        message: string;
    }>;
    acceptContact(req: any, requestId: string): Promise<import("./entities/contact.entity").Contact>;
    refuseContact(req: any, requestId: string): Promise<import("./entities/contact.entity").Contact>;
    getPendingRequests(req: any): Promise<import("./entities/contact.entity").Contact[]>;
}
