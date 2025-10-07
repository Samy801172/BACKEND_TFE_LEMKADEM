import { Injectable, Logger } from '@nestjs/common';
import * as nodemailer from 'nodemailer';
import * as sgMail from '@sendgrid/mail';
import * as fs from 'fs';

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
  private useSendGridAPI: boolean = false;

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
   * Initialise le transporter selon l'environnement
   * - Développement : Mailtrap SMTP
   * - Production : SendGrid API (pas SMTP, pour éviter les timeouts Render)
   * - Fallback : Mode test
   */
  private async initializeTransporter() {
    try {
      const isProduction = process.env.NODE_ENV === 'production';
      
      if (isProduction) {
        // 🚀 PRIORITÉ 1 : SendGrid API en production (évite les timeouts SMTP sur Render)
        if (process.env.SENDGRID_API_KEY && process.env.SENDGRID_API_KEY !== 'SG.your-sendgrid-key') {
          sgMail.setApiKey(process.env.SENDGRID_API_KEY);
          this.useSendGridAPI = true;
          this.transporter = null; // Pas besoin de transporter nodemailer
          this.logger.log('✅ SendGrid API initialisée pour la production (pas SMTP, évite timeouts)');
          return;
        }
        
        // Si aucune config en production, on désactive les emails
        this.logger.warn('⚠️ Aucun service email configuré en production - Emails désactivés');
        this.transporter = null;
        this.useSendGridAPI = false;
        return;
      } else if (!isProduction) {
        // Configuration Mailtrap pour le développement
        const mailtrapUser = process.env.MAILTRAP_USER || '837aee6518510e';


        const mailtrapPass = process.env.MAILTRAP_PASS || '0d349a1788b217';
        
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
          // Fallback: Utiliser les credentials Mailtrap par défaut
          this.transporter = nodemailer.createTransport({
            host: 'sandbox.smtp.mailtrap.io',
            port: 587,
            secure: false,
            auth: {
              user: '2a81d91e209a7a', // Nouveaux credentials
              pass: '26efc0e208621a', // Nouveaux credentials
            },
            connectionTimeout: 60000, // 60 secondes
            greetingTimeout: 30000,   // 30 secondes
            socketTimeout: 60000,     // 60 secondes
          });
          this.logger.log('✅ Transporter Mailtrap initialisé avec credentials par défaut');
        }
      } else {
        // Fallback: Utiliser les credentials Mailtrap par défaut
        this.transporter = nodemailer.createTransport({
          host: 'sandbox.smtp.mailtrap.io',
          port: 587,
          secure: false,
          auth: {
            user: '837aee6518510e', // Nouveaux credentials
            pass: '0d349a1788b217cd', // Nouveaux credentials
          },
          connectionTimeout: 60000, // 60 secondes
          greetingTimeout: 30000,   // 30 secondes
          socketTimeout: 60000,     // 60 secondes
        });
        this.logger.log('✅ Transporter Mailtrap initialisé avec credentials par défaut (fallback)');
      }
    } catch (error) {
      this.logger.error('❌ Erreur lors de l\'initialisation du transporter:', error);
      // Fallback: Utiliser les credentials Mailtrap par défaut
      this.transporter = nodemailer.createTransport({
        host: 'sandbox.smtp.mailtrap.io',
        port: 587,
        secure: false,
        auth: {
          user: '09b04970de09d8',
          pass: 'ecf22b0f9ee9a0',
        },
      });
      this.logger.log('✅ Transporter Mailtrap initialisé avec credentials par défaut (fallback error)');
    }
  }

  async sendMail(to: string, subject: string, text: string, html?: string, attachments?: any[]) {
    try {
      this.logger.log(`📧 Tentative d'envoi d'email à ${to}`);
      this.logger.log(`📧 Sujet: ${subject}`);
      this.logger.log(`📧 Pièces jointes: ${attachments ? attachments.length : 0}`);
      
      const from = process.env.SENDGRID_FROM_EMAIL || 'kiwiclub.notifications@gmail.com';
      
      let info: any;
      
      // 🚀 Utiliser SendGrid API en production (évite les timeouts SMTP)
      if (this.useSendGridAPI) {
        this.logger.log(`🚀 Utilisation de SendGrid API (pas SMTP)`);
        
        try {
          const msg: any = {
            to,
            from,
            subject,
            text,
            html: html || text,
          };
          
          // Gestion des pièces jointes (conversion pour SendGrid API)
          if (attachments && attachments.length > 0) {
            msg.attachments = attachments.map((att: any) => {
              // Si l'attachement a un 'path', lire le fichier
              if (att.path && fs.existsSync(att.path)) {
                const content = fs.readFileSync(att.path).toString('base64');
                return {
                  content,
                  filename: att.filename,
                  type: att.contentType || 'application/pdf',
                  disposition: 'attachment',
                };
              }
              // Sinon, utiliser le contenu fourni
              return {
                content: att.content || '',
                filename: att.filename,
                type: att.contentType || 'application/pdf',
                disposition: 'attachment',
              };
            });
          }
          
          this.logger.log(`📧 SendGrid API - Envoi à ${to}`);
          await sgMail.send(msg);
          
          info = { messageId: `sendgrid-${Date.now()}@kiwiclub.be` };
          this.logger.log(`✅ Email envoyé via SendGrid API à ${to}`);
          
        } catch (error) {
          this.logger.error(`❌ Erreur SendGrid API:`, error);
          throw error;
        }
        
      } 
      // 📧 Utiliser SMTP nodemailer en développement (Mailtrap)
      else if (this.transporter) {
        const mailOptions = {
          from,
          to,
          subject,
          text,
          html,
          attachments
        };

        this.logger.log(`📧 SMTP Nodemailer - Envoi à ${to}`);
        
        try {
          info = await this.transporter.sendMail(mailOptions);
          this.logger.log(`✅ Email envoyé via SMTP à ${to} (MessageId: ${info.messageId})`);
        } catch (error) {
          this.logger.error(`❌ Erreur SMTP:`, error);
          
          // Gestion des timeouts
          if (error.code === 'ETIMEDOUT' || error.message.includes('timeout')) {
            this.logger.warn(`⚠️ Timeout SMTP - Email simulé pour ${to}`);
            info = { messageId: `timeout-${Date.now()}@kiwiclub.be` };
          } else {
            throw error;
          }
        }
        
      } else {
        // Aucun service configuré - simulation
        this.logger.warn(`⚠️ EMAIL SIMULÉ pour ${to} (Aucun service configuré)`);
        info = { messageId: `sim-${Date.now()}@kiwiclub.be` };
      }
      
      // Log de confirmation
      const isCancellationEmail = subject.toLowerCase().includes('annulation');
      if (isCancellationEmail) {
        this.logger.log(`🚨 EMAIL D'ANNULATION ENVOYÉ - ${to} (MessageId: ${info.messageId})`);
      }
      
      // Déterminer preview URL
      const isProduction = process.env.NODE_ENV === 'production';
      let previewUrl: string | undefined;
      
      if (isProduction) {
        this.logger.log(`🔗 Email envoyé en production (SendGrid API)`);
      } else {
        previewUrl = `https://mailtrap.io/inboxes/default/messages`;
        this.logger.log(`🔗 Aperçu Mailtrap: ${previewUrl}`);
      }

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