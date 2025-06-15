/**
 * Service pour la gestion des webhooks externes (GitHub, Stripe, Zapier, etc.)
 * - Vérification de signature
 * - Délégation au service Payment pour Stripe
 * - Logique personnalisée pour chaque source
 */
import { Injectable } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import * as crypto from 'crypto';
import { PaymentService } from '../Payment/services/payment.service';

@Injectable()
export class WebhookService {
  constructor(
    private readonly configService: ConfigService,
    private readonly paymentService: PaymentService
  ) {}

  /**
   * Traite les webhooks Github
   */
  async processGithubWebhook(event: string, payload: any): Promise<void> {
    // Logique de traitement selon le type d'événement
    switch (event) {
      case 'push':
        await this.handleGithubPush(payload);
        break;
      case 'pull_request':
        await this.handleGithubPullRequest(payload);
        break;
      default:
        // Logique non gérée
    }
  }

  /**
   * Traite les webhooks Stripe, en les déléguant au service de paiement
   */
  async processStripeWebhook(signature: string, rawBody: Buffer): Promise<any> {
    return this.paymentService.handleWebhook(signature, rawBody);
  }

  /**
   * Traite les webhooks personnalisés
   */
  async processCustomWebhook(source: string, payload: any): Promise<void> {
    // Logique selon la source
    switch (source) {
      case 'zapier':
        await this.handleZapierWebhook(payload);
        break;
      case 'slack':
        await this.handleSlackWebhook(payload);
        break;
      default:
        await this.handleGenericWebhook(source, payload);
    }
  }

  /**
   * Vérification de la signature GitHub
   */
  verifyGithubSignature(signature: string, payload: Buffer): boolean {
    try {
      const secret = this.configService.get<string>('GITHUB_WEBHOOK_SECRET');
      if (!secret) {
        return false;
      }

      const hmac = crypto.createHmac('sha256', secret);
      const digest = 'sha256=' + hmac.update(payload).digest('hex');
      return crypto.timingSafeEqual(Buffer.from(digest), Buffer.from(signature));
    } catch (error) {
      return false;
    }
  }

  /**
   * Vérification d'une signature personnalisée
   */
  verifyCustomSignature(signature: string, payload: Buffer, source: string): boolean {
    try {
      const secretKey = `${source.toUpperCase()}_WEBHOOK_SECRET`;
      const secret = this.configService.get<string>(secretKey);
      
      if (!secret) {
        return false;
      }

      const hmac = crypto.createHmac('sha256', secret);
      const digest = hmac.update(payload).digest('hex');
      return signature === digest;
    } catch (error) {
      return false;
    }
  }

  // Handlers privés pour les différents types d'événements
  private async handleGithubPush(payload: any): Promise<void> {
    const repository = payload.repository?.name;
    const branch = payload.ref?.replace('refs/heads/', '');
    const commits = payload.commits?.length || 0;
    
    // Logique spécifique aux push GitHub
    // Exemple: déploiement automatique, notification, etc.
  }

  private async handleGithubPullRequest(payload: any): Promise<void> {
    const action = payload.action;
    const pr = payload.pull_request;
    const repo = payload.repository?.name;
    
    // Logique spécifique aux pull requests
    // Exemple: revue automatique, tests, etc.
  }

  private async handleZapierWebhook(payload: any): Promise<void> {
    // Logique spécifique à Zapier
    // Exemple: intégration avec d'autres services
  }

  private async handleSlackWebhook(payload: any): Promise<void> {
    // Logique spécifique à Slack
    // Exemple: commandes Slack, notifications
  }

  private async handleGenericWebhook(source: string, payload: any): Promise<void> {
    // Logique par défaut pour les webhooks non reconnus
  }
} 