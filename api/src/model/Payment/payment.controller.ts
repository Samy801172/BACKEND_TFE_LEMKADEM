/**
 * Contrôleur pour la gestion des paiements (Stripe)
 * - Création de session de paiement
 * - Webhook Stripe
 * - Simulation de paiement (dev)
 * - Succès paiement
 */
import { Controller, Post, Body, UseGuards, Req, Headers, ForbiddenException, Get, Query } from '@nestjs/common';
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
  constructor(private readonly paymentService: PaymentService) {}

  @Post('create-session')
  @ApiBearerAuth()
  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles(UserRole.MEMBER, UserRole.ADMIN)
  async createPaymentSession(
    @Req() req,
    @Body('eventId') eventId: string
  ): Promise<{ url: string }> {
    const isAdmin = req.user.role === UserRole.ADMIN;
    const url = await this.paymentService.createPaymentSession(eventId, req.user.userId, isAdmin);
    return { url };
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
} 