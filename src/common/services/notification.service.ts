import { Injectable, Logger } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import * as sgMail from '@sendgrid/mail';
import * as admin from 'firebase-admin';
import { Notification, NotificationType } from '../../model/Notification/entities/notification.entity';
import { User } from '../../model/User/entities/user.entity';
import { FcmToken } from '../../model/User/entities/fcm-token.entity';

@Injectable()
export class NotificationService {
  private readonly logger = new Logger(NotificationService.name);

  constructor(
    @InjectRepository(Notification)
    private readonly notificationRepository: Repository<Notification>,
    @InjectRepository(User)
    private readonly userRepository: Repository<User>,
    @InjectRepository(FcmToken)
    private readonly fcmTokenRepository: Repository<FcmToken>
  ) {
    // Configuration SendGrid
    if (process.env.SENDGRID_API_KEY) {
      sgMail.setApiKey(process.env.SENDGRID_API_KEY);
    }

    // Configuration Firebase Admin SDK
    if (!admin.apps.length && process.env.FIREBASE_PROJECT_ID) {
      admin.initializeApp({
        credential: admin.credential.cert({
          projectId: process.env.FIREBASE_PROJECT_ID,
          clientEmail: process.env.FIREBASE_CLIENT_EMAIL,
          privateKey: process.env.FIREBASE_PRIVATE_KEY?.replace(/\\n/g, '\n'),
        }),
      });
    }
  }

  /**
   * Envoie un email via SendGrid
   */
  async sendEmail(to: string, subject: string, htmlContent: string, textContent?: string) {
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
    } catch (error) {
      this.logger.error(`Failed to send email to ${to}:`, error);
      return false;
    }
  }

  /**
   * Envoie une notification push via Firebase Cloud Messaging
   */
  async sendPushNotification(token: string, title: string, body: string, data?: any) {
    try {
      // En développement, simuler l'envoi de notification
      if (process.env.NODE_ENV !== 'production') {
        this.logger.log(`🔔 [DEV] Notification simulée: ${title} - ${body}`);
        this.logger.log(`📱 Token: ${token.substring(0, 20)}...`);
        this.logger.log(`📊 Data:`, data);
        return true; // Simuler le succès en développement
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
    } catch (error) {
      this.logger.error(`Failed to send push notification:`, error);
      return false;
    }
  }

  /**
   * Envoie une notification push à plusieurs tokens
   */
  async sendMulticastPushNotification(tokens: string[], title: string, body: string, data?: any) {
    try {
      // En développement, simuler l'envoi de notification
      if (process.env.NODE_ENV !== 'production') {
        this.logger.log(`🔔 [DEV] Notifications multicast simulées: ${title} - ${body}`);
        this.logger.log(`📱 Tokens (${tokens.length}): ${tokens.map(t => t.substring(0, 20) + '...').join(', ')}`);
        this.logger.log(`📊 Data:`, data);
        
        // Simuler une réponse de succès
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

      const response = await admin.messaging().sendMulticast({
        tokens,
        ...message,
      });

      this.logger.log(`Multicast push notification sent: ${response.successCount}/${tokens.length} successful`);
      return response;
    } catch (error) {
      this.logger.error(`Failed to send multicast push notification:`, error);
      return null;
    }
  }

  /**
   * Envoie une confirmation de paiement par email
   */
  async sendPaymentConfirmationEmail(userEmail: string, userName: string, eventTitle: string, amount: number, invoiceUrl?: string) {
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

  /**
   * Envoie une notification de remboursement par email
   */
  async sendRefundNotificationEmail(userEmail: string, userName: string, eventTitle: string, amount: number, reason?: string) {
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

  /**
   * Envoie une notification de rappel d'événement
   */
  async sendEventReminderEmail(userEmail: string, userName: string, eventTitle: string, eventDate: Date, eventLocation: string) {
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

  /**
   * Crée une notification persistante en base de données
   */
  async createNotification(
    recipientId: string,
    title: string,
    content: string,
    type: NotificationType,
    metadata?: Record<string, any>
  ): Promise<Notification> {
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
    } catch (error) {
      this.logger.error(`Failed to create notification for user ${recipientId}:`, error);
      throw error;
    }
  }

  /**
   * Marque une notification comme lue
   */
  async markAsRead(notificationId: string): Promise<Notification> {
    try {
      const notification = await this.notificationRepository.findOne({ where: { id: notificationId } });
      if (!notification) {
        throw new Error(`Notification with ID ${notificationId} not found`);
      }

      notification.is_read = true;
      return await this.notificationRepository.save(notification);
    } catch (error) {
      this.logger.error(`Failed to mark notification ${notificationId} as read:`, error);
      throw error;
    }
  }

  /**
   * Récupère toutes les notifications d'un utilisateur
   */
  async getUserNotifications(userId: string): Promise<Notification[]> {
    try {
      return await this.notificationRepository.find({
        where: { recipient: { id: userId } },
        order: { createdAt: 'DESC' }
      });
    } catch (error) {
      this.logger.error(`Failed to get notifications for user ${userId}:`, error);
      throw error;
    }
  }

  /**
   * Récupère les notifications non lues d'un utilisateur
   */
  async getUnreadNotifications(userId: string): Promise<Notification[]> {
    try {
      return await this.notificationRepository.find({
        where: { 
          recipient: { id: userId },
          is_read: false
        },
        order: { createdAt: 'DESC' }
      });
    } catch (error) {
      this.logger.error(`Failed to get unread notifications for user ${userId}:`, error);
      throw error;
    }
  }

  /**
   * Enregistre un token FCM pour un utilisateur
   */
  async registerFcmToken(userId: string, token: string, platform: string) {
    try {
      // Vérifier si le token existe déjà
      const existingToken = await this.fcmTokenRepository.findOne({
        where: { token, user_id: userId }
      });

      if (existingToken) {
        // Mettre à jour le token existant
        existingToken.platform = platform;
        existingToken.is_active = true;
        existingToken.updated_at = new Date();
        await this.fcmTokenRepository.save(existingToken);
        this.logger.log(`Token FCM mis à jour pour l'utilisateur ${userId}`);
      } else {
        // Créer un nouveau token
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
    } catch (error) {
      this.logger.error(`Erreur lors de l'enregistrement du token FCM: ${error.message}`);
      return false;
    }
  }

  /**
   * Supprime un token FCM pour un utilisateur
   */
  async unregisterFcmToken(userId: string, token: string) {
    try {
      await this.fcmTokenRepository.update(
        { token, user_id: userId },
        { is_active: false }
      );
      this.logger.log(`Token FCM supprimé pour l'utilisateur ${userId}`);
      return true;
    } catch (error) {
      this.logger.error(`Erreur lors de la suppression du token FCM: ${error.message}`);
      return false;
    }
  }

  /**
   * Récupère tous les tokens FCM d'un utilisateur (pour debug)
   */
  async getUserFcmTokens(userId: string) {
    try {
      return await this.fcmTokenRepository.find({
        where: { user_id: userId }
      });
    } catch (error) {
      this.logger.error(`Erreur lors de la récupération des tokens FCM: ${error.message}`);
      return [];
    }
  }

  /**
   * Envoie une notification push à un utilisateur spécifique
   */
  async sendPushNotificationToUser(
    userId: string,
    title: string,
    body: string,
    data?: Record<string, string>
  ) {
    try {
      const tokens = await this.fcmTokenRepository.find({
        where: { user_id: userId, is_active: true }
      });

      if (tokens.length === 0) {
        this.logger.warn(`Aucun token FCM actif trouvé pour l'utilisateur ${userId}`);
        return false;
      }

      // En développement, simuler l'envoi de notifications
      if (process.env.NODE_ENV !== 'production') {
        this.logger.log(`🔔 [DEV] Notification simulée pour l'utilisateur ${userId}: ${title} - ${body}`);
        this.logger.log(`📱 Tokens trouvés: ${tokens.length}`);
        tokens.forEach((token, index) => {
          this.logger.log(`📱 Token ${index + 1}: ${token.token.substring(0, 20)}...`);
        });
        this.logger.log(`📊 Data:`, data);
        return true; // Simuler le succès en développement
      }

      // En production, utiliser Firebase Admin SDK
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
          priority: 'high' as const,
          notification: {
            channelId: 'kiwi_club_channel',
            priority: 'high' as const,
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

      const results = await Promise.allSettled(
        messages.map(message => admin.messaging().send(message))
      );

      const successCount = results.filter(result => result.status === 'fulfilled').length;
      this.logger.log(`Notifications push envoyées: ${successCount}/${tokens.length} réussies pour l'utilisateur ${userId}`);
      
      return successCount > 0;
    } catch (error) {
      this.logger.error(`Erreur lors de l'envoi de notification push: ${error.message}`);
      return false;
    }
  }

  /**
   * Envoie une notification push à tous les utilisateurs
   */
  /**
   * Envoie une notification pour une nouvelle demande de contact
   */
  async sendContactRequestNotification(
    recipientId: string,
    senderName: string,
    senderId: string
  ) {
    const title = 'Nouvelle demande de contact';
    const body = `${senderName} souhaite vous ajouter à ses contacts`;
    
    // Créer la notification en base
    await this.createNotification(
      recipientId,
      title,
      body,
      NotificationType.CONTACT_REQUEST,
      { senderId, senderName }
    );
    
    // Envoyer la notification push
    await this.sendPushNotificationToUser(recipientId, title, body, {
      type: 'contact_request',
      senderId,
      senderName
    });
  }

  /**
   * Envoie une notification pour un nouveau message
   */
  async sendNewMessageNotification(
    recipientId: string,
    senderName: string,
    senderId: string,
    messagePreview: string
  ) {
    const title = `Nouveau message de ${senderName}`;
    const body = messagePreview.length > 50 
      ? `${messagePreview.substring(0, 50)}...` 
      : messagePreview;
    
    // Créer la notification en base
    await this.createNotification(
      recipientId,
      title,
      body,
      NotificationType.NEW_MESSAGE,
      { senderId, senderName, messagePreview }
    );
    
    // Envoyer la notification push
    await this.sendPushNotificationToUser(recipientId, title, body, {
      type: 'new_message',
      senderId,
      senderName
    });
  }

  async sendPushNotificationToAll(
    title: string,
    body: string,
    data?: Record<string, string>
  ) {
    try {
      const tokens = await this.fcmTokenRepository.find({
        where: { is_active: true }
      });

      if (tokens.length === 0) {
        this.logger.warn('Aucun token FCM actif trouvé');
        return false;
      }

      // Grouper les tokens par utilisateur pour éviter les doublons
      const userTokens = new Map<string, string[]>();
      tokens.forEach(token => {
        if (!userTokens.has(token.user_id)) {
          userTokens.set(token.user_id, []);
        }
        userTokens.get(token.user_id)!.push(token.token);
      });

      const messages = Array.from(userTokens.values()).flatMap(tokens => 
        tokens.map(token => ({
          token,
          notification: {
            title,
            body
          },
          data: data || {},
          android: {
            priority: 'high' as const,
            notification: {
              channelId: 'kiwi_club_channel',
              priority: 'high' as const,
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
        }))
      );

      const results = await Promise.allSettled(
        messages.map(message => admin.messaging().send(message))
      );

      const successCount = results.filter(result => result.status === 'fulfilled').length;
      this.logger.log(`Notifications push envoyées: ${successCount}/${messages.length} réussies`);
      
      return successCount > 0;
    } catch (error) {
      this.logger.error(`Erreur lors de l'envoi de notifications push: ${error.message}`);
      return false;
    }
  }
}
