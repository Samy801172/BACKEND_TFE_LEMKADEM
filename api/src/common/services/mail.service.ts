import { Injectable, Logger } from '@nestjs/common';
import * as nodemailer from 'nodemailer';

@Injectable()
export class MailService {
  private readonly logger = new Logger(MailService.name);
  private transporter: nodemailer.Transporter;

  constructor() {
    this.initializeTransporter();
  }

  private initializeTransporter() {
    try {
      this.transporter = nodemailer.createTransport({
        host: 'sandbox.smtp.mailtrap.io', // Remplace par ton host Mailtrap
        port: 2525, // Port Mailtrap
        auth: {
          user: '5f6ec2a96ca64d', // Username Mailtrap
          pass: 'dbbdc3b0be3e3d'  // Password Mailtrap
        }
      });
      this.logger.log('✅ Transporter Mailtrap initialisé avec succès');
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
      return info;
    } catch (error) {
      this.logger.error(`❌ Erreur lors de l'envoi de l'email à ${to}:`, error);
      throw error;
    }
  }
} 