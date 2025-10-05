import { NotificationService } from '../../common/services/notification.service';
export declare class NotificationController {
    private readonly notificationService;
    constructor(notificationService: NotificationService);
    markAsRead(id: string): Promise<import("./entities/notification.entity").Notification>;
    getUserNotifications(req: any): Promise<import("./entities/notification.entity").Notification[]>;
    getUnreadNotifications(req: any): Promise<import("./entities/notification.entity").Notification[]>;
    registerFcmToken(body: {
        fcmToken: string;
        platform: string;
    }, req: any): Promise<{
        success: boolean;
    }>;
    registerFcm(body: {
        token: string;
        platform: string;
    }, req: any): Promise<{
        success: boolean;
        message: string;
    }>;
    unregisterFcmToken(body: {
        fcmToken: string;
    }, req: any): Promise<{
        success: boolean;
    }>;
    unregisterFcm(body: {
        token: string;
    }, req: any): Promise<{
        success: boolean;
        message: string;
    }>;
    testPushNotification(req: any): Promise<{
        success: boolean;
        message: string;
    }>;
    simulateEventFullNotification(req: any): Promise<{
        success: boolean;
        message: string;
    }>;
    debugTokens(req: any): Promise<{
        userId: any;
        tokenCount: number;
        tokens: {
            id: string;
            platform: string;
            isActive: boolean;
            createdAt: Date;
            updatedAt: Date;
            tokenPreview: string;
        }[];
    }>;
}
