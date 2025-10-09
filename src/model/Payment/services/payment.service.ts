/**
 * Service de gestion des paiements Stripe et de la facturation
 * - Création de session Stripe
 * - Gestion des webhooks
 * - Génération de factures PDF
 * - Remboursements
 */
import { Injectable, NotFoundException, ConflictException, BadRequestException } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { Payment, PaymentTransactionStatus } from '../entities/payment.entity';
import { Event } from '../../Event/entities/event.entity';
import { User } from '../../User/entities/user.entity';
import { EventParticipation, ParticipationStatus, PaymentStatus } from '../../Event/entities/event-participation.entity';
import Stripe from 'stripe';
import { ConfigService } from '@nestjs/config';
import { MoreThan, LessThan, In } from 'typeorm';
const PDFDocument = require('pdfkit');
import * as fs from 'fs';
import * as http from 'http';
import { Document, DocumentType } from '../../Document/entities/document.entity';
import { MailService } from '../../../common/services/mail.service';
import { NotificationService } from '@common/services/notification.service';
import { NotificationType } from '../../Notification/entities/notification.entity';

@Injectable()
export class PaymentService {
  private readonly stripe: Stripe;

  constructor(
    @InjectRepository(Payment)
    private readonly paymentRepository: Repository<Payment>,
    @InjectRepository(Event)
    private readonly eventRepository: Repository<Event>,
    @InjectRepository(User)
    private readonly userRepository: Repository<User>,
    @InjectRepository(EventParticipation)
    private readonly participationRepository: Repository<EventParticipation>,
    @InjectRepository(Document)
    private readonly documentRepository: Repository<Document>,
    private readonly configService: ConfigService,
    private readonly mailService: MailService,
    private readonly notificationService: NotificationService
  ) {
    // Initialisation de Stripe avec la clé secrète
    const stripeKey = this.configService.get<string>('STRIPE_SECRET_KEY');
    
    if (!stripeKey) {
      throw new Error('STRIPE_SECRET_KEY is not defined in environment variables');
    }

    try {
      this.stripe = new Stripe(stripeKey.trim(), {
        apiVersion: '2025-02-24.acacia'
      });
    } catch (error) {
      throw error;
    }
  }

  /**
   * Détecte automatiquement le port Flutter en vérifiant les ports courants
   * @returns Le port détecté ou le port par défaut
   */
  private async detectFlutterPort(): Promise<string> {
    // Ports courants pour Flutter web (ajout du port actuel 61013)
    const commonPorts = ['61013', '60263', '59013', '56700', '56969', '8080', '3000', '8081', '8082', '8083', '8084', '8085'];
    
    // Vérifier d'abord les variables d'environnement
    const envPort = process.env.FLUTTER_WEB_PORT || process.env.PORT;
    if (envPort) {
      console.log('[Stripe] Port détecté depuis les variables d\'environnement:', envPort);
      return envPort;
    }
    
    // Essayer de détecter le port Flutter en cours d'exécution
    for (const port of commonPorts) {
      try {
        const isPortAvailable = await this.checkPort(port);
        if (isPortAvailable) {
          console.log(`[Stripe] Port Flutter détecté automatiquement: ${port}`);
          return port;
        }
      } catch (error) {
        // Port non disponible, continuer
      }
    }
    
    // Si aucun port n'est détecté, utiliser le port par défaut
    console.log('[Stripe] Aucun port Flutter détecté, utilisation du port par défaut: 56700');
    return '56700';
  }

  private checkPort(port: string): Promise<boolean> {
    return new Promise((resolve) => {
      const req = http.request({
        hostname: 'localhost',
        port: parseInt(port),
        method: 'HEAD',
        timeout: 1000
      }, (res) => {
        resolve(res.statusCode === 200);
      });

      req.on('error', () => {
        resolve(false);
      });

      req.on('timeout', () => {
        req.destroy();
        resolve(false);
      });

      req.end();
    });
  }

  private async createStripeSessionWithUrl(event: Event, user: User, successBaseUrl: string): Promise<Stripe.Checkout.Session> {
    try {
      const sessionData: Stripe.Checkout.SessionCreateParams = {
        payment_method_types: ['card'],
        line_items: [
          {
            price_data: {
              currency: 'eur',
              product_data: {
                name: event.title,
                description: event.description
              },
              unit_amount: Math.round(event.price * 100)
            },
            quantity: 1
          }
        ],
        mode: 'payment' as Stripe.Checkout.Session.Mode,
        success_url: `${successBaseUrl}?session_id={CHECKOUT_SESSION_ID}&event_id=${event.id}&event_title=${encodeURIComponent(event.title)}`,
        cancel_url: `${successBaseUrl}/`,
        customer_email: user.email,
        expires_at: Math.floor(Date.now() / 1000) + 1800 // Session expire dans 30 minutes
      };
      
      console.log('[Stripe] Données de session à envoyer:', {
        eventTitle: event.title,
        eventPrice: event.price,
        unitAmount: Math.round(event.price * 100),
        customerEmail: user.email,
        successUrl: `${successBaseUrl}?session_id={CHECKOUT_SESSION_ID}&event_id=${event.id}&event_title=${encodeURIComponent(event.title)}`,
        cancelUrl: `${successBaseUrl}/`
      });
      
      const session = await this.stripe.checkout.sessions.create(sessionData);
      console.log('[Stripe] Session Stripe créée avec succès:', { sessionId: session.id, sessionUrl: session.url });
      return session;
    } catch (stripeError) {
      console.error('[Stripe] Erreur lors de la création de la session Stripe', stripeError);
      throw new BadRequestException('Erreur lors de la création de la session de paiement Stripe. Détail : ' + (stripeError.message || stripeError));
    }
  }

  /**
   * Crée une session de paiement Stripe pour un événement
   * @param eventId - ID de l'événement
   * @param userId - ID de l'utilisateur
   * @param isAdmin - Indique si l'utilisateur est admin (pour contourner certaines vérifications)
   * @returns URL de la session de paiement Stripe
   */
  async createPaymentSession(eventId: string, userId: string, isAdmin: boolean = false): Promise<string> {
    try {
      console.log('[Stripe] Début de création de session de paiement', { eventId, userId, isAdmin });
      
      // 1. Récupération de l'événement et de l'utilisateur
      console.log('[Stripe] Recherche de l\'événement et de l\'utilisateur...');
      const event = await this.eventRepository.findOne({ where: { id: eventId } });
      const user = await this.userRepository.findOne({ where: { id: userId } });

      console.log('[Stripe] Résultats de recherche:', { 
        eventFound: !!event, 
        userFound: !!user,
        eventId: event?.id,
        userId: user?.id,
        eventPrice: event?.price,
        userEmail: user?.email
      });

      if (!event || !user) {
        console.error('[Stripe] Event or user not found', { eventId, userId });
        throw new NotFoundException('Event or user not found');
      }

      if (!event.price || event.price <= 0) {
        console.error('[Stripe] Prix de l\'événement invalide', { eventId, price: event.price });
        throw new BadRequestException('Le prix de l\'événement est invalide');
      }
      if (!user.email) {
        console.error('[Stripe] Email utilisateur manquant', { userId });
        throw new BadRequestException('Email utilisateur manquant');
      }

      // URL dynamique pour Flutter web - détecte le port automatiquement
      // Détection automatique du port Flutter
      let flutterPort = await this.detectFlutterPort();
      
      // Vérifier si Flutter est accessible sur le port détecté
      const isFlutterRunning = await this.checkPort(flutterPort);
      if (!isFlutterRunning) {
        console.warn(`[Stripe] ⚠️ Flutter non accessible sur le port ${flutterPort}`);
        console.warn(`[Stripe] 🔄 Tentative de détection d'un autre port...`);
        
        // Essayer de détecter un autre port
        const alternativePorts = ['3000', '60263', '59013', '56700', '56969', '8080'];
        for (const altPort of alternativePorts) {
          if (altPort !== flutterPort) {
            const isAltPortAvailable = await this.checkPort(altPort);
            if (isAltPortAvailable) {
              flutterPort = altPort;
              console.log(`[Stripe] ✅ Port alternatif détecté: ${altPort}`);
              break;
            }
          }
        }
      } else {
        console.log(`[Stripe] ✅ Flutter détecté sur le port ${flutterPort}`);
      }
      
      const flutterUrl = `http://localhost:${flutterPort}`;
      console.log('[Stripe] URL Flutter finale:', flutterUrl);
      
      // Pour mobile, utiliser une URL de deep linking vers l'écran de succès
      const isProduction = process.env.NODE_ENV === 'production';
      
      // FORCER le deep link mobile pour tous les paiements
      const successBaseUrl = 'kiwiclub://payment-success';
      
      console.log('[Stripe] Deep link mobile forcé:', successBaseUrl);
      
      // Vérifier si Flutter est accessible
      try {
        const isFlutterRunning = await this.checkPort(flutterPort);
        if (!isFlutterRunning) {
          console.warn(`[Stripe] ⚠️ Flutter non accessible sur le port ${flutterPort}`);
          console.warn(`[Stripe] 💡 Veuillez lancer Flutter avec: flutter run -d chrome`);
          console.warn(`[Stripe] 🔄 Tentative de détection d'un autre port...`);
          
          // Essayer de détecter un autre port
          const alternativePorts = ['3000', '8080','59013', '56700', '56969'];
          for (const altPort of alternativePorts) {
            if (altPort !== flutterPort) {
              const isAltPortAvailable = await this.checkPort(altPort);
              if (isAltPortAvailable) {
                flutterPort = altPort;
                console.log(`[Stripe] ✅ Port alternatif détecté: ${altPort}`);
                break;
              }
            }
          }
        } else {
          console.log(`[Stripe] ✅ Flutter détecté sur le port ${flutterPort}`);
        }
      } catch (error) {
        console.warn('[Stripe] Erreur lors de la vérification du port Flutter:', error);
      }
      
      console.log('[Stripe] Configuration finale:', {
        isProduction,
        successBaseUrl,
        flutterUrl,
        configFrontendUrl: this.configService.get('FRONTEND_URL'),
        configFlutterWebUrl: this.configService.get('FLUTTER_WEB_URL')
      });

      // 2. Vérification des droits administrateur
      const isAdminUser = isAdmin || user.type_user === 'ADMIN';

      // 3. Vérification de la participation existante
      const existingParticipation = await this.participationRepository.findOne({
        where: {
          event: { id: eventId },
          participant: { id: userId }
        }
      });

      // 4. Vérification si le paiement n'est pas déjà effectué
      const completedPayment = await this.paymentRepository.findOne({
        where: {
          event: { id: eventId },
          user: { id: userId },
          status: PaymentTransactionStatus.COMPLETED
        }
      });

      if (completedPayment && !isAdminUser) {
        // Vérifier si l'utilisateur a une participation
        const participation = await this.participationRepository.findOne({
          where: {
            eventId,
            participantId: userId
          }
        });

        if (participation) {
          // L'utilisateur a déjà payé et a une participation
          throw new ConflictException('Vous avez déjà payé pour cet événement');
        } else {
          // L'utilisateur a payé mais n'a pas de participation (cas d'erreur)
          console.warn('[Stripe] Utilisateur a payé mais pas de participation trouvée:', { eventId, userId });
          
          // Créer automatiquement la participation manquante
          const newParticipation = this.participationRepository.create({
            eventId,
            participantId: userId,
            status: ParticipationStatus.APPROVED,
            payment_status: PaymentStatus.PAID,
            payment_intent_id: completedPayment.transaction_id
          });
          
          await this.participationRepository.save(newParticipation);
          console.log('[Stripe] Participation créée automatiquement pour l\'utilisateur qui a payé');
          
          throw new ConflictException('Vous avez déjà payé pour cet événement. Votre participation a été restaurée.');
        }
      }

      // 5. Vérification des places disponibles (seulement si nouvelle participation)
      if (!existingParticipation) {
        const participantCount = await this.participationRepository.count({
          where: { event: { id: eventId } }
        });

        console.log(`[Stripe] 📊 Vérification des places: ${participantCount}/${event.max_participants} participants`);
        console.log(`[Stripe] 📊 Event: ${event.title}, Max participants: ${event.max_participants}, Current: ${participantCount}`);

        // TEMPORAIRE: Bypass pour test si l'événement est "test500" ou "test3000"
        if ((event.title === 'test500' || event.title === 'test3000') && participantCount >= event.max_participants && !isAdminUser) {
          console.log(`[Stripe] 🧪 TEST: Bypass de la vérification pour ${event.title}`);
          console.log(`[Stripe] 🧪 TEST: Participant count: ${participantCount}, Max: ${event.max_participants}`);
          console.log(`[Stripe] 🧪 TEST: Continuation du processus de paiement...`);
        } else if (participantCount >= event.max_participants && !isAdminUser) {
          console.log(`[Stripe] 🚨 Événement complet détecté: ${event.title}`);
          console.log(`[Stripe] 🚨 Participant count: ${participantCount}, Max: ${event.max_participants}`);
          
          // Ne pas notifier ici - l'événement est déjà complet
          throw new BadRequestException('Cet événement est complet');
        }
      }

      // 6. Nettoyage des anciennes sessions de paiement expirées
      await this.cleanupExpiredSessions(userId);

      // 7. Vérification des sessions de paiement en cours
      const pendingPayment = await this.paymentRepository.findOne({
        where: {
          event: { id: eventId },
          user: { id: userId },
          status: PaymentTransactionStatus.PENDING,
          createdAt: MoreThan(new Date(Date.now() - 30 * 60 * 1000)) // Sessions de moins de 30 minutes
        }
      });

      if (pendingPayment && !isAdminUser) {
        throw new ConflictException('Vous avez déjà une session de paiement en cours. Veuillez la terminer ou attendre qu\'elle expire.');
      }

      // 8. Création de la session Stripe
      console.log('[Stripe] Création de la session Stripe...');
      const session = await this.createStripeSessionWithUrl(event, user, successBaseUrl);

      // 9. Enregistrement du paiement en base de données
      const reference = `${event.id.substring(0, 6)}-${user.id.substring(0, 6)}-${Date.now().toString().substring(9, 13)}`;
      
      const payment = this.paymentRepository.create({
        event,
        user,
        amount: event.price,
        status: PaymentTransactionStatus.PENDING,
        transaction_id: session.id,
        payment_method: 'stripe',
        reference: reference // Référence unique pour le suivi
      });

      await this.paymentRepository.save(payment);
      
      console.log('[Stripe] Paiement enregistré en base, URL de session:', session.url);
      return session.url; // Retourne l'URL de paiement Stripe
    } catch (error) {
      console.error('[Stripe] Erreur lors de la création de la session de paiement', error);
      throw error;
    }
  }

  /**
   * Nettoie les sessions de paiement expirées d'un utilisateur
   * @param userId - ID de l'utilisateur
   */
  private async cleanupExpiredSessions(userId: string): Promise<void> {
    const thirtyMinutesAgo = new Date(Date.now() - 30 * 60 * 1000);
    await this.paymentRepository.delete({
      user: { id: userId },
      status: PaymentTransactionStatus.PENDING,
      createdAt: LessThan(thirtyMinutesAgo)
    });
  }

  /**
   * Gère les webhooks Stripe (notifications de paiement)
   * @param signature - Signature du webhook Stripe
   * @param rawBody - Corps de la requête brut
   */
  async handleWebhook(signature: string, rawBody: Buffer) {
    try {
      // 1. Vérification de base
      if (!rawBody) {
        return { received: false, error: 'No request body' };
      }

      // 2. Log du payload reçu pour debug
      const payload = JSON.parse(rawBody.toString());

      // 3. Vérification de la signature uniquement pour les événements de production
      const webhookSecret = this.configService.get('STRIPE_WEBHOOK_SECRET');
      let event;

      if (payload.livemode === true && webhookSecret) {
        try {
          event = this.stripe.webhooks.constructEvent(
            rawBody,
            signature,
            webhookSecret
          );
        } catch (err) {
          return { received: false, error: 'Invalid signature' };
        }
      } else {
        // En mode test, on accepte sans vérification
        event = payload;
      }

      // 4. Traitement des événements
      switch (event.type) {
        case 'checkout.session.completed':
          await this.handleSuccessfulPayment(event.data.object);
          break;

        case 'checkout.session.expired':
          await this.handleExpiredSession(event.data.object);
          break;

        case 'payment_intent.payment_failed':
          await this.handlePaymentFailure(event.data.object.id);
          break;

        case 'charge.refunded':
          await this.handleRefundCompleted(event.data.object);
          break;

        case 'refund.created':
          await this.handleRefundCreated(event.data.object);
          break;

        case 'refund.updated':
          await this.handleRefundUpdated(event.data.object);
          break;

        default:
          break;
      }

      return { received: true, type: event.type };
    } catch (err) {
      return { received: false, error: err.message };
    }
  }

  /**
   * Gère un paiement réussi
   * @param session - Session Stripe complétée
   */
  private async handleSuccessfulPayment(session: Stripe.Checkout.Session) {
    try {
      console.log('[Stripe] Traitement du paiement réussi pour la session:', session.id);
      
      // 1. Récupération du paiement
      const payment = await this.paymentRepository.findOne({
        where: { transaction_id: session.id },
        relations: ['event', 'user']
      });

      if (!payment) {
        console.error('[Stripe] Paiement non trouvé pour la session:', session.id);
        return;
      }

      // 2. Mise à jour du statut du paiement
      payment.status = PaymentTransactionStatus.COMPLETED;
      payment.stripe_payment_intent_id = session.payment_intent as string;
      await this.paymentRepository.save(payment);

      console.log('[Stripe] Paiement marqué comme complété:', payment.id);

      // 3. Création ou mise à jour de la participation
      let participation = await this.participationRepository.findOne({
        where: {
          eventId: payment.event.id,
          participantId: payment.user.id
        }
      });

      if (!participation) {
        // Création d'une nouvelle participation
        participation = this.participationRepository.create({
          eventId: payment.event.id,
          participantId: payment.user.id,
          status: ParticipationStatus.APPROVED,
          payment_status: PaymentStatus.PAID,
          payment_intent_id: session.payment_intent as string
        });
        console.log('[Stripe] Nouvelle participation créée pour l\'événement:', payment.event.title);
      } else {
        // Mise à jour de la participation existante
        participation.status = ParticipationStatus.APPROVED;
        participation.payment_status = PaymentStatus.PAID;
        participation.payment_intent_id = session.payment_intent as string;
        console.log('[Stripe] Participation mise à jour pour l\'événement:', payment.event.title);
      }

      await this.participationRepository.save(participation);

      // 4. Vérifier si l'événement vient de devenir complet et notifier
      const finalParticipantCount = await this.participationRepository.count({
        where: { event: { id: payment.event.id } }
      });
      
      if (finalParticipantCount === payment.event.max_participants) {
        console.log(`[Stripe] 🎉 Événement "${payment.event.title}" vient de devenir complet !`);
        console.log(`[Stripe] 📊 Participant count: ${finalParticipantCount}/${payment.event.max_participants}`);
        
        // Notifier tous les utilisateurs que l'événement est maintenant complet
        await this.notifyEventFull(payment.event);
      }

      // 5. Génération et enregistrement de la facture PDF (numéro court)
      const shortId = payment.id.slice(-8); // 8 derniers caractères de l'ID
      const invoicePath = `uploads/invoices/invoice-${shortId}.pdf`;
      await this.generateInvoicePDF(payment, invoicePath);

      // 6. Envoi d'email de confirmation avec facture PDF
      try {
        await this.mailService.sendMail(
          payment.user.email,
          'Paiement confirmé - Inscription à l\'événement',
          `Votre paiement pour l'événement "${payment.event.title}" a été confirmé avec succès.\n\nVeuillez trouver votre facture en pièce jointe.\n\nCordialement,\nL'équipe Kiwi Club`,
          `
            <h2>Paiement confirmé !</h2>
            <p>Bonjour,</p>
            <p>Votre paiement pour l'événement <strong>${payment.event.title}</strong> a été confirmé avec succès.</p>
            <p>Détails :</p>
            <ul>
              <li><strong>Événement :</strong> ${payment.event.title}</li>
              <li><strong>Date :</strong> ${payment.event.date.toLocaleDateString('fr-FR')}</li>
              <li><strong>Lieu :</strong> ${payment.event.location}</li>
              <li><strong>Montant :</strong> ${payment.amount}€</li>
            </ul>
            <p>Veuillez trouver votre facture en pièce jointe.</p>
            <p>Cordialement,<br>L'équipe Kiwi Club</p>
          `,
          [{ 
            filename: `facture_${payment.event.title.replace(/[^a-zA-Z0-9]/g, '_')}.pdf`, 
            path: invoicePath,
            contentType: 'application/pdf'
          }]
        );
        console.log('[Stripe] Email de confirmation avec facture envoyé à:', payment.user.email);
      } catch (emailError) {
        console.error('[Stripe] Erreur lors de l\'envoi de l\'email de confirmation:', emailError);
      }

      // 7. Envoi d'une notification par email
      try {
        await this.notificationService.sendPaymentConfirmationEmail(
          payment.user.email,
          payment.user.email,
          payment.event.title,
          payment.amount
        );
        console.log('[Stripe] Notification de confirmation envoyée à:', payment.user.email);
      } catch (notificationError) {
        console.error('[Stripe] Erreur lors de l\'envoi de la notification:', notificationError);
      }

      console.log('[Stripe] Paiement traité avec succès pour l\'événement:', payment.event.title);
    } catch (error) {
      console.error('[Stripe] Erreur lors du traitement du paiement réussi:', error);
      throw error;
    }
  }

  /**
   * Gère une session de paiement expirée
   * @param session - Session Stripe expirée
   */
  private async handleExpiredSession(session: Stripe.Checkout.Session) {
    const payment = await this.paymentRepository.findOne({
      where: { transaction_id: session.id }
    });

    if (payment) {
      payment.status = PaymentTransactionStatus.FAILED;
      await this.paymentRepository.save(payment);
    }
  }

  /**
   * Gère un paiement réussi (appelé après confirmation)
   * @param paymentIntentId - ID de l'intention de paiement Stripe
   */
  async handlePaymentSuccess(paymentIntentId: string): Promise<void> {
    try {
      const participation = await this.participationRepository.findOne({
        where: { payment_intent_id: paymentIntentId }
      });

      if (!participation) {
        throw new NotFoundException('Participation non trouvée');
      }

      participation.status = ParticipationStatus.APPROVED;
      participation.payment_status = PaymentStatus.PAID;

      await this.participationRepository.save(participation);
    } catch (error) {
      throw error;
    }
  }

  /**
   * Gère un échec de paiement
   * @param paymentIntentId - ID de l'intention de paiement Stripe
   */
  async handlePaymentFailure(paymentIntentId: string): Promise<void> {
    try {
      const participation = await this.participationRepository.findOne({
        where: { payment_intent_id: paymentIntentId }
      });

      if (!participation) {
        throw new NotFoundException('Participation non trouvée');
      }

      participation.payment_status = PaymentStatus.FAILED;
      await this.participationRepository.save(participation);
    } catch (error) {
      throw error;
    }
  }

  /**
   * Gère un remboursement créé
   * @param refund - Objet remboursement Stripe
   */
  private async handleRefundCreated(refund: Stripe.Refund): Promise<void> {
    try {
      console.log(`🔄 Remboursement créé: ${refund.id} pour payment_intent: ${refund.payment_intent}`);
      
      // Récupérer le paiement via le payment_intent
      const payment = await this.paymentRepository.findOne({
        where: { transaction_id: refund.payment_intent as string },
        relations: ['event', 'user']
      });

      if (payment) {
        // Mettre à jour le statut du paiement
        payment.status = PaymentTransactionStatus.REFUNDED;
        payment.refundedAt = new Date();
        await this.paymentRepository.save(payment);

        // Mettre à jour la participation
        const participation = await this.participationRepository.findOne({
          where: {
            eventId: payment.event.id,
            participantId: payment.user.id
          }
        });

        if (participation) {
          participation.payment_status = PaymentStatus.REFUNDED;
          await this.participationRepository.save(participation);
        }

        // Envoi d'un email de confirmation de remboursement
        await this.mailService.sendMail(
          payment.user.email,
          'Remboursement confirmé',
          `Votre remboursement pour l'événement "${payment.event.title}" a été traité.`,
          `
            <h1>Remboursement confirmé</h1>
            <p>Bonjour,</p>
            <p>Nous vous confirmons que votre remboursement pour l'événement <strong>${payment.event.title}</strong> a été traité avec succès.</p>
            <p>Détails du remboursement :</p>
            <ul>
              <li>Montant remboursé : ${payment.amount}€</li>
              <li>Référence : ${payment.reference}</li>
              <li>Date : ${new Date().toLocaleDateString()}</li>
              <li>ID Remboursement : ${refund.id}</li>
            </ul>
            <p>Le remboursement sera visible sur votre compte bancaire dans les 5-10 jours ouvrables.</p>
            <p>Nous vous remercions de votre compréhension.</p>
          `
        );

        // Notification pour l'utilisateur
        await this.notificationService.sendRefundNotificationEmail(
          payment.user.email,
          payment.user.email,
          payment.event.title,
          payment.amount,
          'Événement annulé'
        );
      }
    } catch (error) {
      console.error('Erreur lors du traitement du remboursement créé:', error);
    }
  }

  /**
   * Gère un remboursement complété
   * @param charge - Objet charge Stripe remboursée
   */
  private async handleRefundCompleted(charge: Stripe.Charge): Promise<void> {
    try {
      console.log(`✅ Remboursement complété pour charge: ${charge.id}`);
      
      // Récupérer le paiement via le payment_intent de la charge
      const payment = await this.paymentRepository.findOne({
        where: { transaction_id: charge.payment_intent as string },
        relations: ['event', 'user']
      });

      if (payment) {
        // Mettre à jour le statut du paiement
        payment.status = PaymentTransactionStatus.REFUNDED;
        payment.refundedAt = new Date();
        await this.paymentRepository.save(payment);

        console.log(`✅ Paiement ${payment.id} marqué comme remboursé`);
      }
    } catch (error) {
      console.error('Erreur lors du traitement du remboursement complété:', error);
    }
  }

  /**
   * Gère une mise à jour de remboursement
   * @param refund - Objet remboursement Stripe mis à jour
   */
  private async handleRefundUpdated(refund: Stripe.Refund): Promise<void> {
    try {
      console.log(`📝 Remboursement mis à jour: ${refund.id} - Statut: ${refund.status}`);
      
      // Récupérer le paiement via le payment_intent
      const payment = await this.paymentRepository.findOne({
        where: { transaction_id: refund.payment_intent as string },
        relations: ['event', 'user']
      });

      if (payment) {
        // Mettre à jour le statut selon le statut du remboursement
        if (refund.status === 'succeeded') {
          payment.status = PaymentTransactionStatus.REFUNDED;
          payment.refundedAt = new Date();
        } else if (refund.status === 'failed') {
          payment.status = PaymentTransactionStatus.COMPLETED; // Remettre en statut payé
        }
        
        await this.paymentRepository.save(payment);
        console.log(`📝 Paiement ${payment.id} mis à jour selon le statut du remboursement: ${refund.status}`);
      }
    } catch (error) {
      console.error('Erreur lors du traitement de la mise à jour du remboursement:', error);
    }
  }

  /**
   * Notifie tous les utilisateurs qu'un événement est complet
   * @param event - L'événement qui est complet
   */
  private async notifyEventFull(event: Event) {
    try {
      console.log(`[Notification] 🚨 Début de notification d'événement complet: ${event.title}`);
      
      // Récupérer tous les utilisateurs
      const users = await this.userRepository.find();
      console.log(`[Notification] 📧 Utilisateurs trouvés: ${users.length}`);
      
      for (const user of users) {
        try {
          console.log(`[Notification] 📤 Envoi à ${user.email}...`);
          
          // Envoyer un email de notification
          const emailResult = await this.notificationService.sendEmail(
            user.email,
            'Événement complet - Kiwi Club',
            `
            <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto;">
              <div style="background: linear-gradient(135deg, #FF5722, #D84315); color: white; padding: 20px; text-align: center;">
                <h1>🍃 Kiwi Club</h1>
                <h2>Événement complet</h2>
              </div>
              
              <div style="padding: 20px; background: #f9f9f9;">
                <p>Bonjour ${user.prenom || user.email},</p>
                
                <p>L'événement suivant est maintenant complet :</p>
                
                <div style="background: white; padding: 15px; border-radius: 8px; margin: 15px 0;">
                  <h3 style="color: #FF5722; margin-top: 0;">${event.title}</h3>
                  <p><strong>Date :</strong> ${event.date.toLocaleDateString('fr-FR')} à ${event.date.toLocaleTimeString('fr-FR', { hour: '2-digit', minute: '2-digit' })}</p>
                  <p><strong>Lieu :</strong> ${event.location}</p>
                  <p><strong>Prix :</strong> ${event.price}€</p>
                </div>
                
                <p>Malheureusement, il n'y a plus de places disponibles pour cet événement.</p>
                
                <p>Restez connecté pour découvrir nos prochains événements !</p>
                
                <p>Cordialement,<br>L'équipe Kiwi Club</p>
              </div>
              
              <div style="background: #333; color: white; padding: 15px; text-align: center; font-size: 12px;">
                <p>© ${new Date().getFullYear()} Kiwi Club. Tous droits réservés.</p>
              </div>
            </div>
            `,
            `L'événement "${event.title}" est maintenant complet. Date: ${event.date.toLocaleDateString('fr-FR')}, Lieu: ${event.location}, Prix: ${event.price}€`
          );
          console.log(`[Notification] 📧 Email envoyé à ${user.email}: ${emailResult}`);

          // Créer une notification persistante en base de données
          const notification = await this.notificationService.createNotification(
            user.id,
            'Événement complet',
            `L'événement "${event.title}" est maintenant complet. Il n'y a plus de places disponibles.`,
            NotificationType.EVENT_FULL,
            {
              eventId: event.id,
              eventTitle: event.title,
              eventDate: event.date,
              eventLocation: event.location,
              eventPrice: event.price
            }
          );
          console.log(`[Notification] 💾 Notification persistante créée pour ${user.email}: ${notification.id}`);

          // Envoyer une notification push
          const pushResult = await this.notificationService.sendPushNotificationToUser(
            user.id,
            'Événement complet - Kiwi Club',
            `L'événement "${event.title}" est maintenant complet. Il n'y a plus de places disponibles.`,
            {
              type: 'event_full',
              eventId: event.id,
              eventTitle: event.title
            }
          );
          console.log(`[Notification] 📱 Push notification envoyée à ${user.email}: ${pushResult}`);
          
          console.log(`[Notification] ✅ Toutes les notifications envoyées à ${user.email} pour événement complet`);
        } catch (error) {
          console.error(`[Notification] ❌ Erreur lors de l'envoi à ${user.email}:`, error);
        }
      }
      
      console.log(`[Notification] 🎉 Notification d'événement complet terminée pour ${event.title}`);
    } catch (error) {
      console.error('[Notification] ❌ Erreur lors de la notification d\'événement complet:', error);
    }
  }

  /**
   * Simule un paiement réussi (pour les tests)
   * @param eventId - ID de l'événement
   * @param userId - ID de l'utilisateur
   */
  async simulateSuccessfulPayment(eventId: string, userId: string) {
    try {
      // 1. Mise à jour de la participation
      let participation = await this.participationRepository.findOne({
        where: {
          eventId,
          participantId: userId
        }
      });

      if (!participation) {
        throw new NotFoundException('Participation non trouvée');
      }

      // Correction : après paiement, status = APPROVED (jamais CONFIRMED ici)
      participation.status = ParticipationStatus.APPROVED; // Seule la confirmation de présence met CONFIRMED
      participation.payment_status = PaymentStatus.PAID;
      participation.payment_intent_id = `pi_simulated_${Date.now()}`;
      
      await this.participationRepository.save(participation);

      // 2. Création d'un paiement simulé
      const event = await this.eventRepository.findOne({ where: { id: eventId } });
      const user = await this.userRepository.findOne({ where: { id: userId } });

      if (!event || !user) {
        throw new NotFoundException('Événement ou utilisateur non trouvé');
      }

      const payment = this.paymentRepository.create({
        event,
        user,
        amount: event.price,
        status: PaymentTransactionStatus.COMPLETED,
        transaction_id: `cs_simulated_${Date.now()}`,
        payment_method: 'stripe',
        reference: `DEV-${eventId.substring(0, 6)}-${Date.now()}`,
        completedAt: new Date()
      });

      await this.paymentRepository.save(payment);

      return {
        participation,
        payment
      };
    } catch (error) {
      throw error;
    }
  }

  /**
   * Rembourse le paiement Stripe d'une participation à un événement
   * @param eventId - ID de l'événement
   * @param participantId - ID du participant
   */
  async refundParticipationPayment(eventId: string, participantId: string): Promise<void> {
    const payment = await this.paymentRepository.findOne({
      where: {
        event: { id: eventId },
        user: { id: participantId },
        status: PaymentTransactionStatus.COMPLETED
      }
    });
    if (!payment) throw new NotFoundException('Paiement non trouvé');

    // 2. Vérifier que le paiement a bien un ID Stripe (transaction_id)
    if (!payment.transaction_id) {
      throw new NotFoundException('Aucun ID de transaction Stripe trouvé pour ce paiement');
    }

    // 3. Rembourser via Stripe
    try {
      // On récupère la session Stripe pour obtenir le payment_intent
      const session = await this.stripe.checkout.sessions.retrieve(payment.transaction_id);
      if (!session.payment_intent) {
        throw new Error('Aucun payment_intent trouvé dans la session Stripe');
      }

      // On effectue le remboursement
      const refund = await this.stripe.refunds.create({
        payment_intent: session.payment_intent as string
      });

      if (refund.status === 'succeeded') {
        // 4. Mettre à jour le statut du paiement en base
        payment.status = PaymentTransactionStatus.REFUNDED;
        await this.paymentRepository.save(payment);
      } else {
        throw new Error(`Le remboursement Stripe n'a pas réussi: ${refund.status}`);
      }
    } catch (err) {
      throw err;
    }
  }

  /**
   * Met à jour le statut d'un paiement pour un participant et un événement
   */
  async updatePaymentStatus(eventId: string, participantId: string, status: PaymentTransactionStatus): Promise<void> {
    const payment = await this.paymentRepository.findOne({
      where: {
        event: { id: eventId },
        user: { id: participantId }
      }
    });

    if (!payment) {
      throw new NotFoundException('Paiement non trouvé');
    }

    payment.status = status;
    await this.paymentRepository.save(payment);
  }

  /**
   * Teste l'envoi d'une notification d'événement complet
   * @param eventId - ID de l'événement
   */
  async testEventFullNotification(eventId: string) {
    try {
      console.log(`[Test] 🧪 Test de notification d'événement complet pour: ${eventId}`);
      
      const event = await this.eventRepository.findOne({ where: { id: eventId } });
      if (!event) {
        throw new NotFoundException('Événement non trouvé');
      }

      // Simuler la notification d'événement complet
      await this.notifyEventFull(event);
      
      console.log(`[Test] ✅ Notification d'événement complet testée avec succès pour: ${event.title}`);
      
      return {
        eventTitle: event.title,
        message: 'Notification d\'événement complet envoyée avec succès'
      };
    } catch (error) {
      console.error(`[Test] ❌ Erreur lors du test de notification:`, error);
      throw error;
    }
  }

  async refundAllPaymentsForEvent(eventId: string): Promise<void> {
    const result = await this.paymentRepository
      .createQueryBuilder()
      .update(Payment)
      .set({ status: PaymentTransactionStatus.REFUNDED })
      .where('eventId = :eventId', { eventId })
      .andWhere('status = :status', { status: PaymentTransactionStatus.COMPLETED })
      .execute();
  }

  // Ajout de la méthode utilitaire pour générer la facture PDF complète
  private async generateInvoicePDF(payment: Payment, filePath: string) {
    try {
      const doc = new PDFDocument({ margin: 50 });
      const writeStream = fs.createWriteStream(filePath);
      doc.pipe(writeStream);

      // Couleurs
      const primaryColor = '#2E7D32'; // Vert Kiwi Club
      const secondaryColor = '#666666';
      const lightGray = '#F5F5F5';

      // En-tête avec logo et informations
      doc.rect(0, 0, 595, 100).fill(lightGray);
      doc.fillColor(primaryColor);
      doc.fontSize(24).text('KIWI CLUB', 50, 20, { align: 'left' });
      doc.fillColor(secondaryColor);
      doc.fontSize(12).text('Réseau de Networking Professionnel', 50, 45);
      doc.fontSize(10).text('www.kiwiclub.be', 50, 60);
      
      // Numéro de facture et date
      doc.fillColor('black');
      doc.fontSize(16).text('FACTURE', 400, 20, { align: 'right' });
      doc.fontSize(10).text(`N° ${payment.reference.slice(-8)}`, 400, 40, { align: 'right' });
      doc.text(`Date: ${new Date().toLocaleDateString('fr-FR')}`, 400, 55, { align: 'right' });

      // Ligne de séparation
      doc.moveTo(50, 100).lineTo(545, 100).stroke(primaryColor, 2);

      // Informations du client
      doc.moveDown(2);
      doc.fillColor(primaryColor);
      doc.fontSize(14).text('FACTURÉ À:', 50, 120);
      doc.fillColor('black');
      doc.fontSize(12).text(`${payment.user?.prenom || ''} ${payment.user?.nom || ''}`, 50, 140);
      doc.text(`${payment.user?.email || 'N/A'}`, 50, 155);
      if (payment.user?.telephone) {
        doc.text(`Tél: ${payment.user.telephone}`, 50, 170);
      }
      if (payment.user?.entreprise) {
        doc.text(`Entreprise: ${payment.user.entreprise}`, 50, 185);
      }

      // Détails de l'événement
      doc.moveDown(2);
      doc.fillColor(primaryColor);
      doc.fontSize(14).text('DÉTAILS DE L\'ÉVÉNEMENT:', 50, 220);
      doc.fillColor('black');
      doc.fontSize(12).text(`${payment.event?.title || 'N/A'}`, 50, 240);
      doc.text(`Date: ${payment.event?.date ? payment.event.date.toLocaleDateString('fr-FR') : 'N/A'}`, 50, 255);
      doc.text(`Lieu: ${payment.event?.location || 'N/A'}`, 50, 270);

      // Tableau des services
      doc.moveDown(2);
      const tableTop = 320;
      const itemHeight = 30;
      const col1 = 50;
      const col2 = 300;
      const col3 = 400;
      const col4 = 500;

      // En-tête du tableau
      doc.rect(col1, tableTop, 495, itemHeight).fill(primaryColor);
      doc.fillColor('white');
      doc.fontSize(10).text('DESCRIPTION', col1 + 10, tableTop + 10);
      doc.text('QUANTITÉ', col2 + 10, tableTop + 10);
      doc.text('PRIX UNIT.', col3 + 10, tableTop + 10);
      doc.text('TOTAL', col4 + 10, tableTop + 10);

      // Ligne de service
      doc.fillColor('black');
      doc.rect(col1, tableTop + itemHeight, 495, itemHeight).stroke();
      doc.fontSize(10).text(`Participation à l'événement "${payment.event?.title}"`, col1 + 10, tableTop + itemHeight + 10);
      doc.text('1', col2 + 20, tableTop + itemHeight + 10);
      doc.text(`${payment.amount}€`, col3 + 10, tableTop + itemHeight + 10);
      doc.text(`${payment.amount}€`, col4 + 10, tableTop + itemHeight + 10);

      // Sous-total et TVA
      const subtotalY = tableTop + (itemHeight * 2) + 20;
      doc.fontSize(12).text(`Sous-total: ${payment.amount}€`, col3, subtotalY);
      doc.text(`TVA (21%): ${(payment.amount * 0.21).toFixed(2)}€`, col3, subtotalY + 20);
      
      // Total
      const totalY = subtotalY + 50;
      doc.rect(col3, totalY - 10, 145, 30).fill(lightGray);
      doc.fillColor(primaryColor);
      doc.fontSize(14).text(`TOTAL: ${(payment.amount * 1.21).toFixed(2)}€`, col3 + 10, totalY);

      // Informations de paiement
      doc.fillColor('black');
      doc.moveDown(3);
      doc.fontSize(12).text('INFORMATIONS DE PAIEMENT:', 50, totalY + 50);
      doc.fontSize(10).text(`Statut: ${payment.status}`, 50, totalY + 70);
      doc.text(`Date de paiement: ${payment.completedAt ? payment.completedAt.toLocaleDateString('fr-FR') : new Date().toLocaleDateString('fr-FR')}`, 50, totalY + 85);
      doc.text(`Méthode: Stripe`, 50, totalY + 100);
      doc.text(`Référence: ${payment.reference}`, 50, totalY + 115);

      // Conditions et notes
      doc.moveDown(2);
      doc.fontSize(10).text('CONDITIONS:', 50, totalY + 150);
      doc.text('• Paiement effectué via Stripe', 50, totalY + 170);
      doc.text('• Aucun remboursement après le début de l\'événement', 50, totalY + 185);
      doc.text('• En cas d\'annulation, contactez-nous 48h avant l\'événement', 50, totalY + 200);

      // Pied de page
      const footerY = 750;
      doc.rect(0, footerY, 595, 50).fill(lightGray);
      doc.fillColor(secondaryColor);
      doc.fontSize(8).text('Merci de votre confiance et à bientôt chez Kiwi Club!', 50, footerY + 15, { align: 'center' });
      doc.text('Pour toute question: contact@kiwiclub.be', 50, footerY + 30, { align: 'center' });

      doc.end();

      return new Promise((resolve, reject) => {
        writeStream.on('finish', resolve);
        writeStream.on('error', reject);
      });
    } catch (error) {
      throw error;
    }
  }

  /**
   * Vérifie un paiement par session ID
   * @param sessionId - ID de la session Stripe
   * @param userId - ID de l'utilisateur
   * @returns Détails du paiement
   */
  async verifyPayment(sessionId: string, userId: string): Promise<any> {
    try {
      const payment = await this.paymentRepository.findOne({
        where: { 
          transaction_id: sessionId,
          user: { id: userId }
        },
        relations: ['event', 'user']
      });

      if (!payment) {
        throw new NotFoundException('Paiement non trouvé');
      }

      return {
        id: payment.id,
        amount: payment.amount,
        status: payment.status,
        reference: payment.reference,
        createdAt: payment.createdAt,
        completedAt: payment.completedAt,
        event: payment.event ? {
          id: payment.event.id,
          title: payment.event.title,
          description: payment.event.description,
          date: payment.event.date,
          location: payment.event.location,
          price: payment.event.price
        } : null,
        user: payment.user ? {
          id: payment.user.id,
          email: payment.user.email,
          nom: payment.user.nom,
          prenom: payment.user.prenom
        } : null
      };
    } catch (error) {
      throw error;
    }
  }
} 