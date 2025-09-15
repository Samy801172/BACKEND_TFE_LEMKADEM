import { Injectable, Logger } from '@nestjs/common';
import * as nodemailer from 'nodemailer';

interface PresenceConfirmationData {
  participantName: string;
  participantEmail: string;
  eventTitle: string;
  eventDate: Date;
  eventLocation: string;
  adminEmail: string;
}

@Injectable()
export class MailService {
  private readonly logger = new Logger(MailService.name);
  private transporter: nodemailer.Transporter | null = null;

  // Stockage en mémoire des emails envoyés
  private sentEmails: Array<{
    to: string;
    from: string;
    subject: string;
    text: string;
    html?: string;
    attachments?: any[];
    messageId: string;
    previewUrl?: string;
    date: Date;
  }> = [];

  constructor() {
    this.initializeTransporter();
  }

  /**
   * Initialise le transporter SMTP selon l'environnement
   * - Développement : Mailtrap (avec fallback vers mode test)
   * - Production : SendGrid (avec fallback vers mode test)
   * - Fallback : Mode test (aucun email réellement envoyé)
   */
  private async initializeTransporter() {
    try {
      const isProduction = process.env.NODE_ENV === 'production';
      
      if (isProduction && process.env.SENDGRID_API_KEY) {
        // Configuration SendGrid pour la production
        this.transporter = nodemailer.createTransport({
          host: 'smtp.sendgrid.net',
          port: 587,
          secure: false,
          auth: {
            user: 'apikey', // Toujours 'apikey' pour SendGrid
            pass: process.env.SENDGRID_API_KEY, // API Key SendGrid
          },
        });
        this.logger.log('✅ Transporter SendGrid initialisé pour la production');
      } else if (!isProduction) {
        // Configuration Mailtrap pour le développement
        const mailtrapUser = '7fa7ac39aba9b7';
        const mailtrapPass = 'b7297ce1cc7032';
        
        // Vérifier si les credentials Mailtrap sont disponibles
        if (mailtrapUser && mailtrapPass) {
          this.transporter = nodemailer.createTransport({
            host: 'sandbox.smtp.mailtrap.io',
            port: 587,
            secure: false,
            auth: {
              user: mailtrapUser,
              pass: mailtrapPass,
            },
          });
          this.logger.log(`✅ Transporter Mailtrap initialisé pour le développement (user: ${mailtrapUser})`);
        } else {
          // Fallback: Transporter de test sans envoi réel
          this.transporter = nodemailer.createTransport({
            streamTransport: true,
            newline: 'unix',
            buffer: true
          });
          this.logger.warn('⚠️ Transporter de test initialisé (aucun email ne sera envoyé réellement)');
        }
      } else {
        // Fallback: Transporter de test
        this.transporter = nodemailer.createTransport({
          streamTransport: true,
          newline: 'unix',
          buffer: true
        });
        this.logger.warn('⚠️ Configuration email manquante, transporter de test initialisé (aucun email ne sera envoyé)');
      }
    } catch (error) {
      this.logger.error('❌ Erreur lors de l\'initialisation du transporter:', error);
      // Fallback: Créer un transporter de test pour éviter de casser l'application
      this.transporter = nodemailer.createTransport({
        streamTransport: true,
        newline: 'unix',
        buffer: true
      });
      this.logger.warn('⚠️ Transporter de test créé en mode fallback');
    }
  }

  async sendMail(to: string, subject: string, text: string, html?: string, attachments?: any[]) {
    try {
      this.logger.log(`Tentative d'envoi d'email à ${to}`);
      
      if (!this.transporter) {
        this.logger.error('Transporter non initialisé');
        throw new Error('Service d\'envoi d\'emails non initialisé');
      }

      const mailOptions = {
        from: 'no-reply@monapp.com',
        to,
        subject,
        text,
        html,
        attachments
      };

      const info = await this.transporter.sendMail(mailOptions);
      
      // Vérifier si c'est un transporter de test
      const isTestTransporter = this.transporter.options && this.transporter.options.streamTransport;
      
      if (isTestTransporter) {
        this.logger.log(`✅ Email simulé pour ${to} (Mode test - aucun email réellement envoyé)`);
        // Créer un messageId fictif pour les logs
        info.messageId = `test-${Date.now()}@test.local`;
      } else {
        this.logger.log(`✅ Email envoyé avec succès à ${to} (MessageId: ${info.messageId})`);
      }
      
      // Déterminer le type de preview URL selon l'environnement
      const isProduction = process.env.NODE_ENV === 'production';
      let previewUrl: string | undefined;
      
      if (isTestTransporter) {
        this.logger.log(`🔗 Mode test activé - aucun email réellement envoyé`);
      } else if (isProduction) {
        // En production, pas de preview URL (SendGrid)
        this.logger.log(`🔗 Email envoyé via SendGrid (production)`);
      } else {
        // En développement, utiliser Mailtrap
        previewUrl = `https://mailtrap.io/inboxes/default/messages`;
        this.logger.log(`🔗 Aperçu Mailtrap: ${previewUrl}`);
      }

      // Récupère l'expéditeur (from) pour l'enregistrer avec l'email
      const from = mailOptions.from || 'no-reply@monapp.com';

      // Stocke l'email envoyé dans le tableau en mémoire
      this.sentEmails.unshift({
        to,
        from,
        subject,
        text,
        html,
        attachments,
        messageId: info.messageId,
        previewUrl: previewUrl,
        date: new Date()
      });
      // Limite à 50 emails en mémoire pour éviter une fuite mémoire
      if (this.sentEmails.length > 50) this.sentEmails.length = 50;

      return { ...info, previewUrl: previewUrl };
    } catch (error) {
      this.logger.error(`❌ Erreur lors de l'envoi de l'email à ${to}:`, error);
      throw error;
    }
  }

  /**
   * Envoie un email de confirmation de présence à l'administrateur
   * @param data - Données de la confirmation de présence
   * Ne fait jamais échouer le flux principal si l'email échoue (log uniquement)
   */
  async sendPresenceConfirmationEmail(data: PresenceConfirmationData) {
    const subject = `Confirmation de présence - ${data.eventTitle}`;
    
    const text = `
      Bonjour,
      
      ${data.participantName} (${data.participantEmail}) a confirmé sa présence à l'événement "${data.eventTitle}".
      
      Détails de l'événement :
      - Titre : ${data.eventTitle}
      - Date : ${data.eventDate.toLocaleDateString('fr-FR')}
      - Lieu : ${data.eventLocation}
      
      Cordialement,
      Club Network
    `;

    const html = `
      <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto;">
        <h2 style="color: #2c3e50;">Confirmation de présence</h2>
        
        <p>Bonjour,</p>
        
        <p><strong>${data.participantName}</strong> (${data.participantEmail}) a confirmé sa présence à l'événement.</p>
        
        <div style="background-color: #f8f9fa; padding: 20px; border-radius: 8px; margin: 20px 0;">
          <h3 style="color: #3498db; margin-top: 0;">Détails de l'événement</h3>
          <ul style="list-style: none; padding: 0;">
            <li><strong>Titre :</strong> ${data.eventTitle}</li>
            <li><strong>Date :</strong> ${data.eventDate.toLocaleDateString('fr-FR')}</li>
            <li><strong>Lieu :</strong> ${data.eventLocation}</li>
          </ul>
        </div>
        
        <p style="color: #7f8c8d; font-size: 14px;">
          Cordialement,<br>
          <strong>Club Network</strong>
        </p>
      </div>
    `;

    try {
      await this.sendMail(data.adminEmail, subject, text, html);
      this.logger.log(`✅ Email de confirmation de présence envoyé à ${data.adminEmail}`);
    } catch (error) {
      this.logger.error(`❌ Erreur lors de l'envoi de l'email de confirmation de présence:`, error);
      // Ne jamais throw ici, pour ne pas bloquer la confirmation de présence
    }
  }

  // Méthode pour récupérer la liste réelle des emails envoyés
  getSentEmails() {
    return this.sentEmails;
  }
} 