/**
 * Contrôleur pour la gestion des webhooks externes (GitHub, Stripe, Zapier, etc.)
 * - Vérification de signature
 * - Délégation au service Webhook
 */
import { Body, Controller, Headers, Post, UnauthorizedException } from '@nestjs/common';
import { ApiTags, ApiOperation } from '@nestjs/swagger';
import { Public } from '@common/config';
import { RawBodyRequest } from '@common/decorators/raw-body-request.decorator';
import { WebhookService } from './webhook.service';

@ApiTags('webhooks')
@Controller('webhooks')
export class WebhookController {
  constructor(
    private readonly webhookService: WebhookService
  ) {}

  /**
   * Endpoint pour recevoir les webhooks GitHub
   * - Vérifie la signature pour s'assurer que la requête vient bien de GitHub
   * - Délègue le traitement de l'événement au service
   */
  @Post('github')
  @Public()
  @ApiOperation({ summary: 'Webhook pour GitHub' })
  async handleGithubWebhook(
    @Headers('x-hub-signature-256') signature: string,
    @Headers('x-github-event') event: string,
    @RawBodyRequest() rawBody: Buffer,
    @Body() payload: any
  ) {
    try {
      // Vérification de la signature GitHub
      const isValid = this.webhookService.verifyGithubSignature(signature, rawBody);
      if (!isValid) {
        // Si la signature n'est pas valide, on refuse la requête
        throw new UnauthorizedException('Signature invalide');
      }

      // Traitement de l'événement GitHub (push, pull_request, etc.)
      await this.webhookService.processGithubWebhook(event, payload);

      // Réponse de succès
      return { success: true, message: `Webhook GitHub ${event} traité avec succès` };
    } catch (error) {
      throw error;
    }
  }

  /**
   * Endpoint pour recevoir les webhooks Stripe
   * - Récupère la signature Stripe et le corps brut de la requête
   * - Délègue la vérification et le traitement au service
   */
  @Post('stripe')
  @Public()
  @ApiOperation({ summary: 'Webhook pour Stripe' })
  async handleStripeWebhook(
    @Headers('stripe-signature') signature: string,
    @RawBodyRequest() rawBody: Buffer
  ) {
    try {
      // Délégation au service qui gère la vérification et le traitement Stripe
      const result = await this.webhookService.processStripeWebhook(signature, rawBody);
      return result;
    } catch (error) {
      throw error;
    }
  }

  /**
   * Endpoint pour recevoir des webhooks personnalisés (autres services)
   * - Vérifie la signature si fournie
   * - Délègue le traitement au service
   */
  @Post('custom')
  @Public()
  @ApiOperation({ summary: 'Webhook personnalisé' })
  async handleCustomWebhook(
    @Headers('x-webhook-signature') signature: string,
    @Headers('x-webhook-source') source: string,
    @RawBodyRequest() rawBody: Buffer,
    @Body() payload: any
  ) {
    try {
      // Vérification de signature si fournie (optionnelle selon la source)
      if (signature && source) {
        const isValid = this.webhookService.verifyCustomSignature(signature, rawBody, source);
        if (!isValid) {
          throw new UnauthorizedException('Signature invalide');
        }
      }

      // Traitement du webhook personnalisé
      await this.webhookService.processCustomWebhook(source, payload);

      // Réponse de succès
      return { success: true, message: `Webhook ${source || 'personnalisé'} traité avec succès` };
    } catch (error) {
      throw error;
    }
  }
} 