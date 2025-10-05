import { Repository } from 'typeorm';
import { Notification, NotificationType } from '../../model/Notification/entities/notification.entity';
import { User } from '../../model/User/entities/user.entity';
import { FcmToken } from '../../model/User/entities/fcm-token.entity';
export declare class NotificationService {
    private readonly notificationRepository;
    private readonly userRepository;
    private readonly fcmTokenRepository;
    private readonly logger;
    constructor(notificationRepository: Repository<Notification>, userRepository: Repository<User>, fcmTokenRepository: Repository<FcmToken>);
    sendEmail(to: string, subject: string, htmlContent: string, textContent?: string): Promise<boolean>;
    sendPushNotification(token: string, title: string, body: string, data?: any): Promise<boolean>;
    sendMulticastPushNotification(tokens: string[], title: string, body: string, data?: any): Promise<false | {
        successCount: number;
        failureCount: number;
        responses: {
            success: boolean;
        }[];
    }>;
    sendPaymentConfirmationEmail(userEmail: string, userName: string, eventTitle: string, amount: number, invoiceUrl?: string): Promise<boolean>;
    sendRefundNotificationEmail(userEmail: string, userName: string, eventTitle: string, amount: number, reason?: string): Promise<boolean>;
    sendEventReminderEmail(userEmail: string, userName: string, eventTitle: string, eventDate: Date, eventLocation: string): Promise<boolean>;
    createNotification(recipientId: string, title: string, content: string, type: NotificationType, metadata?: Record<string, any>): Promise<Notification>;
    markAsRead(notificationId: string): Promise<Notification>;
    getUserNotifications(userId: string): Promise<Notification[]>;
    getUnreadNotifications(userId: string): Promise<Notification[]>;
    registerFcmToken(userId: string, token: string, platform: string): Promise<boolean>;
    unregisterFcmToken(userId: string, token: string): Promise<boolean>;
    getUserFcmTokens(userId: string): Promise<FcmToken[]>;
    sendPushNotificationToUser(userId: string, title: string, body: string, data?: Record<string, string>): Promise<boolean>;
    sendContactRequestNotification(recipientId: string, senderName: string, senderId: string): Promise<void>;
    sendNewMessageNotification(recipientId: string, senderName: string, senderId: string, messagePreview: string): Promise<void>;
    sendPushNotificationToAll(title: string, body: string, data?: Record<string, string>): Promise<boolean>;
}
