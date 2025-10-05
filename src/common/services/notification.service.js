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
var NotificationService_1;
Object.defineProperty(exports, "__esModule", { value: true });
exports.NotificationService = void 0;
const common_1 = require("@nestjs/common");
const typeorm_1 = require("@nestjs/typeorm");
const typeorm_2 = require("typeorm");
const sgMail = require("@sendgrid/mail");
const admin = require("firebase-admin");
const notification_entity_1 = require("../../model/Notification/entities/notification.entity");
const user_entity_1 = require("../../model/User/entities/user.entity");
const fcm_token_entity_1 = require("../../model/User/entities/fcm-token.entity");
let NotificationService = NotificationService_1 = class NotificationService {
    constructor(notificationRepository, userRepository, fcmTokenRepository) {
        var _a;
        this.notificationRepository = notificationRepository;
        this.userRepository = userRepository;
        this.fcmTokenRepository = fcmTokenRepository;
        this.logger = new common_1.Logger(NotificationService_1.name);
        if (process.env.SENDGRID_API_KEY) {
            sgMail.setApiKey(process.env.SENDGRID_API_KEY);
        }
        if (!admin.apps.length && process.env.FIREBASE_PROJECT_ID) {
            admin.initializeApp({
                credential: admin.credential.cert({
                    projectId: process.env.FIREBASE_PROJECT_ID,
                    clientEmail: process.env.FIREBASE_CLIENT_EMAIL,
                    privateKey: (_a = process.env.FIREBASE_PRIVATE_KEY) === null || _a === void 0 ? void 0 : _a.replace(/\\n/g, '\n'),
                }),
            });
        }
    }
    async sendEmail(to, subject, htmlContent, textContent) {
        try {
            if (!process.env.SENDGRID_API_KEY) {
                this.logger.warn('SendGrid API key not configured');
                return false;
            }
            const msg = {
                to,
                from: process.env.SENDGRID_FROM_EMAIL || 'noreply@kiwiclub.be',
                subject,
                text: textContent,
                html: htmlContent,
            };
            await sgMail.send(msg);
            this.logger.log(`Email sent successfully to ${to}`);
            return true;
        }
        catch (error) {
            this.logger.error(`Failed to send email to ${to}:`, error);
            return false;
        }
    }
    async sendPushNotification(token, title, body, data) {
        try {
            if (process.env.NODE_ENV !== 'production') {
                this.logger.log(`🔔 [DEV] Notification simulée: ${title} - ${body}`);
                this.logger.log(`📱 Token: ${token.substring(0, 20)}...`);
                this.logger.log(`📊 Data:`, data);
                return true;
            }
            if (!admin.apps.length) {
                this.logger.warn('Firebase Admin SDK not configured');
                return false;
            }
            const message = {
                token,
                notification: {
                    title,
                    body,
                },
                data: data || {},
                android: {
                    notification: {
                        sound: 'default',
                        channelId: 'kiwi-club',
                    },
                },
                apns: {
                    payload: {
                        aps: {
                            sound: 'default',
                        },
                    },
                },
            };
            const response = await admin.messaging().send(message);
            this.logger.log(`Push notification sent successfully: ${response}`);
            return true;
        }
        catch (error) {
            this.logger.error(`Failed to send push notification:`, error);
            return false;
        }
    }
    async sendMulticastPushNotification(tokens, title, body, data) {
        try {
            if (process.env.NODE_ENV !== 'production') {
                this.logger.log(`🔔 [DEV] Notifications multicast simulées: ${title} - ${body}`);
                this.logger.log(`📱 Tokens (${tokens.length}): ${tokens.map(t => t.substring(0, 20) + '...').join(', ')}`);
                this.logger.log(`📊 Data:`, data);
                return {
                    successCount: tokens.length,
                    failureCount: 0,
                    responses: tokens.map(() => ({ success: true }))
                };
            }
            if (!admin.apps.length) {
                this.logger.warn('Firebase Admin SDK not configured');
                return false;
            }
            const message = {
                notification: {
                    title,
                    body,
                },
                data: data || {},
                android: {
                    notification: {
                        sound: 'default',
                        channelId: 'kiwi-club',
                    },
                },
                apns: {
                    payload: {
                        aps: {
                            sound: 'default',
                        },
                    },
                },
            };
            const response = await admin.messaging().sendMulticast(Object.assign({ tokens }, message));
            this.logger.log(`Multicast push notification sent: ${response.successCount}/${tokens.length} successful`);
            return response;
        }
        catch (error) {
            this.logger.error(`Failed to send multicast push notification:`, error);
            return null;
        }
    }
    async sendPaymentConfirmationEmail(userEmail, userName, eventTitle, amount, invoiceUrl) {
        const subject = 'Confirmation de paiement - Kiwi Club';
        const htmlContent = `
      <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto;">
        <div style="background: linear-gradient(135deg, #4CAF50, #45a049); color: white; padding: 20px; text-align: center;">
          <h1>🍃 Kiwi Club</h1>
          <h2>Confirmation de paiement</h2>
        </div>
        
        <div style="padding: 20px; background: #f9f9f9;">
          <p>Bonjour ${userName},</p>
          
          <p>Nous confirmons votre paiement pour l'événement suivant :</p>
          
          <div style="background: white; padding: 15px; border-radius: 8px; margin: 15px 0;">
            <h3 style="color: #4CAF50; margin-top: 0;">${eventTitle}</h3>
            <p><strong>Montant payé :</strong> ${amount}€</p>
            <p><strong>Date de paiement :</strong> ${new Date().toLocaleDateString('fr-FR')}</p>
          </div>
          
          ${invoiceUrl ? `<p><a href="${invoiceUrl}" style="background: #4CAF50; color: white; padding: 10px 20px; text-decoration: none; border-radius: 5px;">Télécharger la facture</a></p>` : ''}
          
          <p>Merci de votre confiance !</p>
          
          <p>Cordialement,<br>L'équipe Kiwi Club</p>
        </div>
        
        <div style="background: #333; color: white; padding: 15px; text-align: center; font-size: 12px;">
          <p>© 2024 Kiwi Club. Tous droits réservés.</p>
        </div>
      </div>
    `;
        return this.sendEmail(userEmail, subject, htmlContent);
    }
    async sendRefundNotificationEmail(userEmail, userName, eventTitle, amount, reason) {
        const subject = 'Remboursement confirmé - Kiwi Club';
        const htmlContent = `
      <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto;">
        <div style="background: linear-gradient(135deg, #FF9800, #F57C00); color: white; padding: 20px; text-align: center;">
          <h1>🍃 Kiwi Club</h1>
          <h2>Remboursement confirmé</h2>
        </div>
        
        <div style="padding: 20px; background: #f9f9f9;">
          <p>Bonjour ${userName},</p>
          
          <p>Votre remboursement a été traité avec succès :</p>
          
          <div style="background: white; padding: 15px; border-radius: 8px; margin: 15px 0;">
            <h3 style="color: #FF9800; margin-top: 0;">${eventTitle}</h3>
            <p><strong>Montant remboursé :</strong> ${amount}€</p>
            <p><strong>Date de remboursement :</strong> ${new Date().toLocaleDateString('fr-FR')}</p>
            ${reason ? `<p><strong>Raison :</strong> ${reason}</p>` : ''}
          </div>
          
          <p>Le remboursement sera visible sur votre compte bancaire dans les 3-5 jours ouvrables.</p>
          
          <p>Merci de votre compréhension !</p>
          
          <p>Cordialement,<br>L'équipe Kiwi Club</p>
        </div>
        
        <div style="background: #333; color: white; padding: 15px; text-align: center; font-size: 12px;">
          <p>© 2024 Kiwi Club. Tous droits réservés.</p>
        </div>
      </div>
    `;
        return this.sendEmail(userEmail, subject, htmlContent);
    }
    async sendEventReminderEmail(userEmail, userName, eventTitle, eventDate, eventLocation) {
        const subject = 'Rappel - Votre événement Kiwi Club approche !';
        const htmlContent = `
      <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto;">
        <div style="background: linear-gradient(135deg, #2196F3, #1976D2); color: white; padding: 20px; text-align: center;">
          <h1>🍃 Kiwi Club</h1>
          <h2>Rappel d'événement</h2>
        </div>
        
        <div style="padding: 20px; background: #f9f9f9;">
          <p>Bonjour ${userName},</p>
          
          <p>Votre événement approche ! N'oubliez pas :</p>
          
          <div style="background: white; padding: 15px; border-radius: 8px; margin: 15px 0;">
            <h3 style="color: #2196F3; margin-top: 0;">${eventTitle}</h3>
            <p><strong>Date :</strong> ${eventDate.toLocaleDateString('fr-FR')} à ${eventDate.toLocaleTimeString('fr-FR', { hour: '2-digit', minute: '2-digit' })}</p>
            <p><strong>Lieu :</strong> ${eventLocation}</p>
          </div>
          
          <p>Nous avons hâte de vous voir !</p>
          
          <p>Cordialement,<br>L'équipe Kiwi Club</p>
        </div>
        
        <div style="background: #333; color: white; padding: 15px; text-align: center; font-size: 12px;">
          <p>© 2024 Kiwi Club. Tous droits réservés.</p>
        </div>
      </div>
    `;
        return this.sendEmail(userEmail, subject, htmlContent);
    }
    async createNotification(recipientId, title, content, type, metadata) {
        try {
            const recipient = await this.userRepository.findOne({ where: { id: recipientId } });
            if (!recipient) {
                throw new Error(`User with ID ${recipientId} not found`);
            }
            const notification = this.notificationRepository.create({
                title,
                content,
                type,
                recipient,
                metadata,
                is_read: false
            });
            return await this.notificationRepository.save(notification);
        }
        catch (error) {
            this.logger.error(`Failed to create notification for user ${recipientId}:`, error);
            throw error;
        }
    }
    async markAsRead(notificationId) {
        try {
            const notification = await this.notificationRepository.findOne({ where: { id: notificationId } });
            if (!notification) {
                throw new Error(`Notification with ID ${notificationId} not found`);
            }
            notification.is_read = true;
            return await this.notificationRepository.save(notification);
        }
        catch (error) {
            this.logger.error(`Failed to mark notification ${notificationId} as read:`, error);
            throw error;
        }
    }
    async getUserNotifications(userId) {
        try {
            return await this.notificationRepository.find({
                where: { recipient: { id: userId } },
                order: { createdAt: 'DESC' }
            });
        }
        catch (error) {
            this.logger.error(`Failed to get notifications for user ${userId}:`, error);
            throw error;
        }
    }
    async getUnreadNotifications(userId) {
        try {
            return await this.notificationRepository.find({
                where: {
                    recipient: { id: userId },
                    is_read: false
                },
                order: { createdAt: 'DESC' }
            });
        }
        catch (error) {
            this.logger.error(`Failed to get unread notifications for user ${userId}:`, error);
            throw error;
        }
    }
    async registerFcmToken(userId, token, platform) {
        try {
            const existingToken = await this.fcmTokenRepository.findOne({
                where: { token, user_id: userId }
            });
            if (existingToken) {
                existingToken.platform = platform;
                existingToken.is_active = true;
                existingToken.updated_at = new Date();
                await this.fcmTokenRepository.save(existingToken);
                this.logger.log(`Token FCM mis à jour pour l'utilisateur ${userId}`);
            }
            else {
                const fcmToken = this.fcmTokenRepository.create({
                    token,
                    platform,
                    user_id: userId,
                    is_active: true
                });
                await this.fcmTokenRepository.save(fcmToken);
                this.logger.log(`Nouveau token FCM enregistré pour l'utilisateur ${userId}`);
            }
            return true;
        }
        catch (error) {
            this.logger.error(`Erreur lors de l'enregistrement du token FCM: ${error.message}`);
            return false;
        }
    }
    async unregisterFcmToken(userId, token) {
        try {
            await this.fcmTokenRepository.update({ token, user_id: userId }, { is_active: false });
            this.logger.log(`Token FCM supprimé pour l'utilisateur ${userId}`);
            return true;
        }
        catch (error) {
            this.logger.error(`Erreur lors de la suppression du token FCM: ${error.message}`);
            return false;
        }
    }
    async getUserFcmTokens(userId) {
        try {
            return await this.fcmTokenRepository.find({
                where: { user_id: userId }
            });
        }
        catch (error) {
            this.logger.error(`Erreur lors de la récupération des tokens FCM: ${error.message}`);
            return [];
        }
    }
    async sendPushNotificationToUser(userId, title, body, data) {
        try {
            const tokens = await this.fcmTokenRepository.find({
                where: { user_id: userId, is_active: true }
            });
            if (tokens.length === 0) {
                this.logger.warn(`Aucun token FCM actif trouvé pour l'utilisateur ${userId}`);
                return false;
            }
            if (process.env.NODE_ENV !== 'production') {
                this.logger.log(`🔔 [DEV] Notification simulée pour l'utilisateur ${userId}: ${title} - ${body}`);
                this.logger.log(`📱 Tokens trouvés: ${tokens.length}`);
                tokens.forEach((token, index) => {
                    this.logger.log(`📱 Token ${index + 1}: ${token.token.substring(0, 20)}...`);
                });
                this.logger.log(`📊 Data:`, data);
                return true;
            }
            if (!admin.apps.length) {
                this.logger.warn('Firebase Admin SDK not configured');
                return false;
            }
            const messages = tokens.map(token => ({
                token: token.token,
                notification: {
                    title,
                    body
                },
                data: data || {},
                android: {
                    priority: 'high',
                    notification: {
                        channelId: 'kiwi_club_channel',
                        priority: 'high',
                        defaultSound: true,
                        defaultVibrateTimings: true
                    }
                },
                apns: {
                    payload: {
                        aps: {
                            sound: 'default',
                            badge: 1
                        }
                    }
                }
            }));
            const results = await Promise.allSettled(messages.map(message => admin.messaging().send(message)));
            const successCount = results.filter(result => result.status === 'fulfilled').length;
            this.logger.log(`Notifications push envoyées: ${successCount}/${tokens.length} réussies pour l'utilisateur ${userId}`);
            return successCount > 0;
        }
        catch (error) {
            this.logger.error(`Erreur lors de l'envoi de notification push: ${error.message}`);
            return false;
        }
    }
    async sendContactRequestNotification(recipientId, senderName, senderId) {
        const title = 'Nouvelle demande de contact';
        const body = `${senderName} souhaite vous ajouter à ses contacts`;
        await this.createNotification(recipientId, title, body, notification_entity_1.NotificationType.CONTACT_REQUEST, { senderId, senderName });
        await this.sendPushNotificationToUser(recipientId, title, body, {
            type: 'contact_request',
            senderId,
            senderName
        });
    }
    async sendNewMessageNotification(recipientId, senderName, senderId, messagePreview) {
        const title = `Nouveau message de ${senderName}`;
        const body = messagePreview.length > 50
            ? `${messagePreview.substring(0, 50)}...`
            : messagePreview;
        await this.createNotification(recipientId, title, body, notification_entity_1.NotificationType.NEW_MESSAGE, { senderId, senderName, messagePreview });
        await this.sendPushNotificationToUser(recipientId, title, body, {
            type: 'new_message',
            senderId,
            senderName
        });
    }
    async sendPushNotificationToAll(title, body, data) {
        try {
            const tokens = await this.fcmTokenRepository.find({
                where: { is_active: true }
            });
            if (tokens.length === 0) {
                this.logger.warn('Aucun token FCM actif trouvé');
                return false;
            }
            const userTokens = new Map();
            tokens.forEach(token => {
                if (!userTokens.has(token.user_id)) {
                    userTokens.set(token.user_id, []);
                }
                userTokens.get(token.user_id).push(token.token);
            });
            const messages = Array.from(userTokens.values()).flatMap(tokens => tokens.map(token => ({
                token,
                notification: {
                    title,
                    body
                },
                data: data || {},
                android: {
                    priority: 'high',
                    notification: {
                        channelId: 'kiwi_club_channel',
                        priority: 'high',
                        defaultSound: true,
                        defaultVibrateTimings: true
                    }
                },
                apns: {
                    payload: {
                        aps: {
                            sound: 'default',
                            badge: 1
                        }
                    }
                }
            })));
            const results = await Promise.allSettled(messages.map(message => admin.messaging().send(message)));
            const successCount = results.filter(result => result.status === 'fulfilled').length;
            this.logger.log(`Notifications push envoyées: ${successCount}/${messages.length} réussies`);
            return successCount > 0;
        }
        catch (error) {
            this.logger.error(`Erreur lors de l'envoi de notifications push: ${error.message}`);
            return false;
        }
    }
};
exports.NotificationService = NotificationService;
exports.NotificationService = NotificationService = NotificationService_1 = __decorate([
    (0, common_1.Injectable)(),
    __param(0, (0, typeorm_1.InjectRepository)(notification_entity_1.Notification)),
    __param(1, (0, typeorm_1.InjectRepository)(user_entity_1.User)),
    __param(2, (0, typeorm_1.InjectRepository)(fcm_token_entity_1.FcmToken)),
    __metadata("design:paramtypes", [typeorm_2.Repository,
        typeorm_2.Repository,
        typeorm_2.Repository])
], NotificationService);
//# sourceMappingURL=notification.service.js.map