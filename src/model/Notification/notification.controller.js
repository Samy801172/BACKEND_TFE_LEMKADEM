"use strict";
var __decorate = (this && this.__decorate) || function (decorators, target, key, desc) {
    var c = arguments.length, r = c < 3 ? target : desc === null ? desc = Object.getOwnPropertyDescriptor(target, key) : desc, d;
    if (typeof Reflect === "object" && typeof Reflect.decorate === "function") r = Reflect.decorate(decorators, target, key, desc);
    else for (var i = decorators.length - 1; i >= 0; i--) if (d = decorators[i]) r = (c < 3 ? d(r) : c > 3 ? d(target, key, r) : d(target, key)) || r;
    return c > 3 && r && Object.defineProperty(target, key, r), r;
};
var __metadata = (this && this.__metadata) || function (k, v) {
    if (typeof Reflect === "object" && typeof Reflect.metadata === "function") return Reflect.metadata(k, v);
};
var __param = (this && this.__param) || function (paramIndex, decorator) {
    return function (target, key) { decorator(target, key, paramIndex); }
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.NotificationController = void 0;
const common_1 = require("@nestjs/common");
const swagger_1 = require("@nestjs/swagger");
const notification_service_1 = require("../../common/services/notification.service");
const jwt_auth_guard_1 = require("../../feature/security/guards/jwt-auth.guard");
let NotificationController = class NotificationController {
    constructor(notificationService) {
        this.notificationService = notificationService;
    }
    async markAsRead(id) {
        return this.notificationService.markAsRead(id);
    }
    async getUserNotifications(req) {
        return this.notificationService.getUserNotifications(req.user.userId);
    }
    async getUnreadNotifications(req) {
        return this.notificationService.getUnreadNotifications(req.user.userId);
    }
    async registerFcmToken(body, req) {
        const userId = req.user.userId;
        const success = await this.notificationService.registerFcmToken(userId, body.fcmToken, body.platform);
        return { success };
    }
    async registerFcm(body, req) {
        const userId = req.user.userId;
        const success = await this.notificationService.registerFcmToken(userId, body.token, body.platform);
        return { success, message: 'Token FCM enregistré avec succès' };
    }
    async unregisterFcmToken(body, req) {
        const userId = req.user.userId;
        const success = await this.notificationService.unregisterFcmToken(userId, body.fcmToken);
        return { success };
    }
    async unregisterFcm(body, req) {
        const userId = req.user.userId;
        const success = await this.notificationService.unregisterFcmToken(userId, body.token);
        return { success, message: 'Token FCM supprimé avec succès' };
    }
    async testPushNotification(req) {
        const userId = req.user.userId;
        const success = await this.notificationService.sendPushNotificationToUser(userId, 'Test Kiwi Club', 'Ceci est une notification push de test ! 🎉', {
            type: 'test',
            timestamp: new Date().toISOString()
        });
        return { success, message: 'Notification push de test envoyée' };
    }
    async simulateEventFullNotification(req) {
        const userId = req.user.userId;
        const success = await this.notificationService.sendPushNotificationToUser(userId, 'Événement complet - Kiwi Club', 'L\'événement "test500" est maintenant complet. Il n\'y a plus de places disponibles.', {
            type: 'event_full',
            eventId: 'test-event-id',
            eventTitle: 'test500'
        });
        return { success, message: 'Notification d\'événement complet simulée' };
    }
    async debugTokens(req) {
        const userId = req.user.userId;
        const tokens = await this.notificationService.getUserFcmTokens(userId);
        return {
            userId,
            tokenCount: tokens.length,
            tokens: tokens.map(t => ({
                id: t.id,
                platform: t.platform,
                isActive: t.is_active,
                createdAt: t.created_at,
                updatedAt: t.updated_at,
                tokenPreview: t.token.substring(0, 20) + '...'
            }))
        };
    }
};
exports.NotificationController = NotificationController;
__decorate([
    (0, common_1.Post)(':id/read'),
    (0, swagger_1.ApiResponse)({ status: 200, description: 'Notification marquée comme lue' }),
    __param(0, (0, common_1.Param)('id')),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [String]),
    __metadata("design:returntype", Promise)
], NotificationController.prototype, "markAsRead", null);
__decorate([
    (0, common_1.Get)(),
    (0, swagger_1.ApiResponse)({ status: 200, description: 'Liste des notifications de l\'utilisateur' }),
    __param(0, (0, common_1.Req)()),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [Object]),
    __metadata("design:returntype", Promise)
], NotificationController.prototype, "getUserNotifications", null);
__decorate([
    (0, common_1.Get)('unread'),
    (0, swagger_1.ApiResponse)({ status: 200, description: 'Liste des notifications non lues' }),
    __param(0, (0, common_1.Req)()),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [Object]),
    __metadata("design:returntype", Promise)
], NotificationController.prototype, "getUnreadNotifications", null);
__decorate([
    (0, common_1.Post)('register-token'),
    (0, swagger_1.ApiResponse)({ status: 200, description: 'Token FCM enregistré' }),
    __param(0, (0, common_1.Body)()),
    __param(1, (0, common_1.Req)()),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [Object, Object]),
    __metadata("design:returntype", Promise)
], NotificationController.prototype, "registerFcmToken", null);
__decorate([
    (0, common_1.Post)('register-fcm'),
    (0, swagger_1.ApiResponse)({ status: 200, description: 'Token FCM enregistré' }),
    __param(0, (0, common_1.Body)()),
    __param(1, (0, common_1.Req)()),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [Object, Object]),
    __metadata("design:returntype", Promise)
], NotificationController.prototype, "registerFcm", null);
__decorate([
    (0, common_1.Delete)('unregister-token'),
    (0, swagger_1.ApiResponse)({ status: 200, description: 'Token FCM supprimé' }),
    __param(0, (0, common_1.Body)()),
    __param(1, (0, common_1.Req)()),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [Object, Object]),
    __metadata("design:returntype", Promise)
], NotificationController.prototype, "unregisterFcmToken", null);
__decorate([
    (0, common_1.Post)('unregister-fcm'),
    (0, swagger_1.ApiResponse)({ status: 200, description: 'Token FCM supprimé' }),
    __param(0, (0, common_1.Body)()),
    __param(1, (0, common_1.Req)()),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [Object, Object]),
    __metadata("design:returntype", Promise)
], NotificationController.prototype, "unregisterFcm", null);
__decorate([
    (0, common_1.Post)('test-push'),
    (0, swagger_1.ApiResponse)({ status: 200, description: 'Notification push de test envoyée' }),
    __param(0, (0, common_1.Req)()),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [Object]),
    __metadata("design:returntype", Promise)
], NotificationController.prototype, "testPushNotification", null);
__decorate([
    (0, common_1.Post)('simulate-event-full'),
    (0, swagger_1.ApiResponse)({ status: 200, description: 'Notification d\'événement complet simulée' }),
    __param(0, (0, common_1.Req)()),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [Object]),
    __metadata("design:returntype", Promise)
], NotificationController.prototype, "simulateEventFullNotification", null);
__decorate([
    (0, common_1.Get)('debug-tokens'),
    (0, swagger_1.ApiResponse)({ status: 200, description: 'Tokens FCM de l\'utilisateur' }),
    __param(0, (0, common_1.Req)()),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [Object]),
    __metadata("design:returntype", Promise)
], NotificationController.prototype, "debugTokens", null);
exports.NotificationController = NotificationController = __decorate([
    (0, swagger_1.ApiTags)('notifications'),
    (0, common_1.Controller)('notifications'),
    (0, common_1.UseGuards)(jwt_auth_guard_1.JwtAuthGuard),
    (0, swagger_1.ApiBearerAuth)(),
    __metadata("design:paramtypes", [notification_service_1.NotificationService])
], NotificationController);
//# sourceMappingURL=notification.controller.js.map