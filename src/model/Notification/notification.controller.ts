import { Controller, Post, Param, Get, UseGuards, Req, Body, Delete } from '@nestjs/common';
import { ApiTags, ApiBearerAuth, ApiResponse } from '@nestjs/swagger';
import { NotificationService } from '../../common/services/notification.service';
import { JwtAuthGuard } from '../../feature/security/guards/jwt-auth.guard';

@ApiTags('notifications')
@Controller('notifications')
@UseGuards(JwtAuthGuard)
@ApiBearerAuth()
export class NotificationController {
  constructor(private readonly notificationService: NotificationService) {}

  /**
   * Route pour marquer une notification comme lue (is_read = true)
   * Appelée en POST sur /notifications/:id/read
   */
  @Post(':id/read')
  @ApiResponse({ status: 200, description: 'Notification marquée comme lue' })
  async markAsRead(@Param('id') id: string) {
    return this.notificationService.markAsRead(id);
  }

  /**
   * Récupère toutes les notifications de l'utilisateur connecté
   */
  @Get()
  @ApiResponse({ status: 200, description: 'Liste des notifications de l\'utilisateur' })
  async getUserNotifications(@Req() req) {
    return this.notificationService.getUserNotifications(req.user.userId);
  }

  /**
   * Récupère les notifications non lues de l'utilisateur connecté
   */
  @Get('unread')
  @ApiResponse({ status: 200, description: 'Liste des notifications non lues' })
  async getUnreadNotifications(@Req() req) {
    return this.notificationService.getUnreadNotifications(req.user.userId);
  }

  /**
   * Route pour enregistrer un token FCM (ancienne version)
   * Appelée en POST sur /notifications/register-token
   */
  @Post('register-token')
  @ApiResponse({ status: 200, description: 'Token FCM enregistré' })
  async registerFcmToken(@Body() body: { fcmToken: string; platform: string }, @Req() req: any) {
    const userId = req.user.userId;
    const success = await this.notificationService.registerFcmToken(
      userId,
      body.fcmToken,
      body.platform
    );
    return { success };
  }

  /**
   * Route pour enregistrer un token FCM (nouvelle version)
   * Appelée en POST sur /notifications/register-fcm
   */
  @Post('register-fcm')
  @ApiResponse({ status: 200, description: 'Token FCM enregistré' })
  async registerFcm(@Body() body: { token: string; platform: string }, @Req() req: any) {
    const userId = req.user.userId;
    const success = await this.notificationService.registerFcmToken(
      userId,
      body.token,
      body.platform
    );
    return { success, message: 'Token FCM enregistré avec succès' };
  }

  /**
   * Route pour supprimer un token FCM (ancienne version)
   * Appelée en DELETE sur /notifications/unregister-token
   */
  @Delete('unregister-token')
  @ApiResponse({ status: 200, description: 'Token FCM supprimé' })
  async unregisterFcmToken(@Body() body: { fcmToken: string }, @Req() req: any) {
    const userId = req.user.userId;
    const success = await this.notificationService.unregisterFcmToken(
      userId,
      body.fcmToken
    );
    return { success };
  }

  /**
   * Route pour supprimer un token FCM (nouvelle version)
   * Appelée en POST sur /notifications/unregister-fcm
   */
  @Post('unregister-fcm')
  @ApiResponse({ status: 200, description: 'Token FCM supprimé' })
  async unregisterFcm(@Body() body: { token: string }, @Req() req: any) {
    const userId = req.user.userId;
    const success = await this.notificationService.unregisterFcmToken(
      userId,
      body.token
    );
    return { success, message: 'Token FCM supprimé avec succès' };
  }

  /**
   * Route de test pour envoyer une notification push
   * Appelée en POST sur /notifications/test-push
   */
  @Post('test-push')
  @ApiResponse({ status: 200, description: 'Notification push de test envoyée' })
  async testPushNotification(@Req() req: any) {
    const userId = req.user.userId;
    const success = await this.notificationService.sendPushNotificationToUser(
      userId,
      'Test Kiwi Club',
      'Ceci est une notification push de test ! 🎉',
      {
        type: 'test',
        timestamp: new Date().toISOString()
      }
    );
    return { success, message: 'Notification push de test envoyée' };
  }

  /**
   * Route pour simuler une notification d'événement complet
   * Appelée en POST sur /notifications/simulate-event-full
   */
  @Post('simulate-event-full')
  @ApiResponse({ status: 200, description: 'Notification d\'événement complet simulée' })
  async simulateEventFullNotification(@Req() req: any) {
    const userId = req.user.userId;
    const success = await this.notificationService.sendPushNotificationToUser(
      userId,
      'Événement complet - Kiwi Club',
      'L\'événement "test500" est maintenant complet. Il n\'y a plus de places disponibles.',
      {
        type: 'event_full',
        eventId: 'test-event-id',
        eventTitle: 'test500'
      }
    );
    return { success, message: 'Notification d\'événement complet simulée' };
  }

  /**
   * Route de debug pour vérifier les tokens FCM d'un utilisateur
   * Appelée en GET sur /notifications/debug-tokens
   */
  @Get('debug-tokens')
  @ApiResponse({ status: 200, description: 'Tokens FCM de l\'utilisateur' })
  async debugTokens(@Req() req: any) {
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
} 