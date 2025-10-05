import { Response } from 'express';
import { MailService } from './mail.service';
export declare class MailTestController {
    private readonly mailService;
    constructor(mailService: MailService);
    getEmailPreviews(res: Response): Promise<Response<any, Record<string, any>>>;
    sendTestEmail(data: {
        to: string;
        subject: string;
        message: string;
    }): Promise<{
        success: boolean;
        messageId: any;
        previewUrl: any;
        error?: undefined;
    } | {
        success: boolean;
        error: any;
        messageId?: undefined;
        previewUrl?: undefined;
    }>;
    getMailtrapUrls(): Promise<string[]>;
    testMailConfig(): Promise<{
        success: boolean;
        config: {
            environment: string;
            isProduction: boolean;
            mailtrap: {
                user: string;
                pass: string;
                host: string;
                port: number;
            };
            sendgrid: {
                apiKey: string;
                fromEmail: string;
            };
        };
        message: string;
        error?: undefined;
    } | {
        success: boolean;
        error: any;
        config?: undefined;
        message?: undefined;
    }>;
}
