/**
 * Contrôleur pour la gestion des paiements (Stripe)
 * - Création de session de paiement
 * - Webhook Stripe
 * - Simulation de paiement (dev)
 * - Succès paiement
 */
import { Controller, Post, Body, UseGuards, Req, Headers, ForbiddenException, Get, Query, Param } from '@nestjs/common';
import { PaymentService } from './services/payment.service';
import { JwtAuthGuard } from '@feature/security/guards/jwt-auth.guard';
import { ApiTags, ApiBearerAuth, ApiOperation } from '@nestjs/swagger';
import { Public } from '@common/config';
import { RolesGuard } from '@feature/security/guards/roles.guard';
import { Roles } from '@feature/security/decorators/roles.decorator';
import { UserRole } from '@model/User/entities/user-role.enum';
import { Request } from 'express';

@ApiTags('payments')
@Controller('payments')
export class PaymentController {
  constructor(private readonly paymentService: PaymentService) {
    console.log('[PaymentController] Contrôleur de paiement initialisé');
  }

  @Post('create-session')
  @ApiBearerAuth()
  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles(UserRole.MEMBER, UserRole.ADMIN)
  async createPaymentSession(
    @Req() req,
    @Body('eventId') eventId: string
  ): Promise<{ url: string }> {
    console.log('[PaymentController] Début de createPaymentSession', { 
      eventId, 
      userId: req.user.userId, 
      role: req.user.role 
    });
    
    const isAdmin = req.user.role === UserRole.ADMIN;
    console.log('[PaymentController] Appel du service de paiement...');
    
    try {
      const url = await this.paymentService.createPaymentSession(eventId, req.user.userId, isAdmin);
      console.log('[PaymentController] URL de session reçue:', url);
      return { url };
    } catch (error) {
      console.error('[PaymentController] Erreur dans createPaymentSession:', error);
      throw error;
    }
  }

  @Post('webhook')
  @Public()
  async handleWebhook(
    @Headers('stripe-signature') signature: string,
    @Req() request: Request
  ) {
    try {
      const payload = (request as any).rawBody;
      
      if (!payload) {
        return { received: false, error: 'No raw body found' };
      }

      if (!signature) {
        return { received: false, error: 'No Stripe signature found' };
      }

      const result = await this.paymentService.handleWebhook(signature, payload);
      return { received: true, ...result };
    } catch (error) {
      return { 
        received: true, 
        error: error.message,
        handled: false
      };
    }
  }

  @Post('create-admin-session')
  @ApiBearerAuth()
  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles(UserRole.ADMIN)
  async createAdminPaymentSession(
    @Req() req,
    @Body('eventId') eventId: string,
    @Body('userId') userId: string
  ): Promise<{ url: string }> {
    const url = await this.paymentService.createPaymentSession(eventId, userId, true);
    return { url };
  }

  @Post('dev/complete-payment')
  @Public()
  @ApiOperation({ summary: 'Endpoint de développement pour simuler un paiement complet' })
  async simulatePaymentCompletion(
    @Body() data: { eventId: string, userId: string }
  ) {
    if (process.env.NODE_ENV === 'production') {
      throw new ForbiddenException('Cet endpoint est uniquement disponible en développement');
    }

    try {
      const result = await this.paymentService.simulateSuccessfulPayment(data.eventId, data.userId);
      return {
        success: true,
        message: 'Paiement simulé avec succès',
        data: result
      };
    } catch (error) {
      throw error;
    }
  }

  @Get('success')
  @Public()
  async handlePaymentSuccess(
    @Query('session_id') sessionId: string
  ) {
    return {
      success: true,
      message: 'Paiement effectué avec succès',
      sessionId
    };
  }

  @Get('verify/:sessionId')
  @ApiBearerAuth()
  @UseGuards(JwtAuthGuard)
  async verifyPayment(@Req() req, @Param('sessionId') sessionId: string) {
    try {
      const payment = await this.paymentService.verifyPayment(sessionId, req.user.userId);
      return {
        success: true,
        data: payment
      };
    } catch (error) {
      throw error;
    }
  }

  /**
   * Endpoint de test pour vérifier le statut d'un événement
   * @param eventId - ID de l'événement
   */
  @Get('event-status/:eventId')
  @ApiBearerAuth()
  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles(UserRole.MEMBER, UserRole.ADMIN)
  @ApiOperation({ summary: 'Vérifie le statut d\'un événement (pour debug)' })
  async getEventStatus(
    @Param('eventId') eventId: string,
    @Req() req: any
  ): Promise<any> {
    try {
      const event = await this.paymentService['eventRepository'].findOne({ 
        where: { id: eventId },
        relations: ['participations']
      });
      
      if (!event) {
        return { error: 'Event not found' };
      }
      
      const participantCount = event.participations.length;
      const isFull = participantCount >= event.max_participants;
      
      return {
        eventId: event.id,
        title: event.title,
        maxParticipants: event.max_participants,
        currentParticipants: participantCount,
        isFull,
        participations: event.participations.map(p => ({
          participantId: p.participantId,
          status: p.status,
          paymentStatus: p.payment_status
        }))
      };
    } catch (error) {
      return { error: error.message };
    }
  }

  /**
   * Endpoint de test pour simuler une notification push
   * @param eventId - ID de l'événement
   */
  @Post('test-notification/:eventId')
  @ApiBearerAuth()
  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles(UserRole.ADMIN)
  @ApiOperation({ summary: 'Simule une notification de paiement complet pour un événement' })
  async testNotification(@Param('eventId') eventId: string) {
    try {
      const result = await this.paymentService.testEventFullNotification(eventId);
      return {
        success: true,
        message: 'Notification de test envoyée',
        data: result
      };
    } catch (error) {
      throw error;
    }
  }
} 