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

  constructor() {
    this.initializeTransporter();
  }

  /**
   * Initialise le transporter SMTP avec un compte Ethereal personnel
   * Remplace la création automatique de compte de test par une config manuelle
   */
  private async initializeTransporter() {
    try {
      // Configuration SMTP Ethereal (remplace par tes identifiants)
      this.transporter = nodemailer.createTransport({
        host: 'smtp.ethereal.email', // Hôte SMTP Ethereal
        port: 587,                   // Port SMTP (465 = SSL, 587 = TLS)
        secure: false,               // true pour 465, false pour 587
        auth: {
          user: 'mckayla29@ethereal.email', // Ton email Ethereal
          pass: 'UVF6JF2rY5PjfCcUDZ',         // Ton mot de passe Ethereal
        },
      });
      this.logger.log('✅ Transporter Ethereal (compte réel) initialisé avec succès');
    } catch (error) {
      this.logger.error('❌ Erreur lors de l\'initialisation du transporter:', error);
      throw error;
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
      this.logger.log(`✅ Email envoyé avec succès à ${to} (MessageId: ${info.messageId})`);
      this.logger.log(`🔗 Aperçu Ethereal: ${nodemailer.getTestMessageUrl(info)}`);
      return info;
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
} 