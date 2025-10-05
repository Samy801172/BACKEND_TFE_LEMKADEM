interface PresenceConfirmationData {
    participantName: string;
    participantEmail: string;
    eventTitle: string;
    eventDate: Date;
    eventLocation: string;
    adminEmail: string;
}
export declare class MailService {
    private readonly logger;
    private transporter;
    private sentEmails;
    constructor();
    private initializeTransporter;
    sendMail(to: string, subject: string, text: string, html?: string, attachments?: any[]): Promise<any>;
    sendPresenceConfirmationEmail(data: PresenceConfirmationData): Promise<void>;
    getSentEmails(): {
        to: string;
        from: string;
        subject: string;
        text: string;
        html?: string;
        attachments?: any[];
        messageId: string;
        previewUrl?: string;
        date: Date;
    }[];
}
export {};
