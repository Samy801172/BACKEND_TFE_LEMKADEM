"use strict";
var __decorate = (this && this.__decorate) || function (decorators, target, key, desc) {
    var c = arguments.length, r = c < 3 ? target : desc === null ? desc = Object.getOwnPropertyDescriptor(target, key) : desc, d;
    if (typeof Reflect === "object" && typeof Reflect.decorate === "function") r = Reflect.decorate(decorators, target, key, desc);
    else for (var i = decorators.length - 1; i >= 0; i--) if (d = decorators[i]) r = (c < 3 ? d(r) : c > 3 ? d(target, key, r) : d(target, key)) || r;
    return c > 3 && r && Object.defineProperty(target, key, r), r;
};
var __metadata = (this && this.__metadata) || function (k, v) {
    if (typeof Reflect === "object" && typeof Reflect.metadata === "function") return Reflect.metadata(k, v);
};
var MailService_1;
Object.defineProperty(exports, "__esModule", { value: true });
exports.MailService = void 0;
const common_1 = require("@nestjs/common");
const nodemailer = require("nodemailer");
let MailService = MailService_1 = class MailService {
    constructor() {
        this.logger = new common_1.Logger(MailService_1.name);
        this.transporter = null;
        this.sentEmails = [];
        this.initializeTransporter();
    }
    async initializeTransporter() {
        try {
            const isProduction = process.env.NODE_ENV === 'production';
            if (isProduction && process.env.SENDGRID_API_KEY) {
                this.transporter = nodemailer.createTransport({
                    host: 'smtp.sendgrid.net',
                    port: 587,
                    secure: false,
                    auth: {
                        user: 'apikey',
                        pass: process.env.SENDGRID_API_KEY,
                    },
                });
                this.logger.log('✅ Transporter SendGrid initialisé pour la production');
            }
            else if (!isProduction) {
                const mailtrapUser = process.env.MAILTRAP_USER || '2a81d91e209a7a';
                const mailtrapPass = process.env.MAILTRAP_PASS || '26efc0e208621a';
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
                }
                else {
                    this.transporter = nodemailer.createTransport({
                        host: 'sandbox.smtp.mailtrap.io',
                        port: 587,
                        secure: false,
                        auth: {
                            user: '09b04970de09d8',
                            pass: 'ecf22b0f9ee9a0',
                        },
                    });
                    this.logger.log('✅ Transporter Mailtrap initialisé avec credentials par défaut');
                }
            }
            else {
                this.transporter = nodemailer.createTransport({
                    host: 'sandbox.smtp.mailtrap.io',
                    port: 587,
                    secure: false,
                    auth: {
                        user: '09b04970de09d8',
                        pass: 'ecf22b0f9ee9a0',
                    },
                });
                this.logger.log('✅ Transporter Mailtrap initialisé avec credentials par défaut (fallback)');
            }
        }
        catch (error) {
            this.logger.error('❌ Erreur lors de l\'initialisation du transporter:', error);
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
    async sendMail(to, subject, text, html, attachments) {
        try {
            this.logger.log(`📧 Tentative d'envoi d'email à ${to}`);
            this.logger.log(`📧 Sujet: ${subject}`);
            this.logger.log(`📧 Pièces jointes: ${attachments ? attachments.length : 0}`);
            if (!this.transporter) {
                this.logger.error('❌ Transporter non initialisé');
                throw new Error('Service d\'envoi d\'emails non initialisé');
            }
            const mailOptions = {
                from: 'no-reply@kiwiclub.be',
                to,
                subject,
                text,
                html,
                attachments
            };
            this.logger.log(`📧 Options email:`, JSON.stringify(mailOptions, null, 2));
            const info = await this.transporter.sendMail(mailOptions);
            const isTestTransporter = this.transporter.options && this.transporter.options.streamTransport;
            if (isTestTransporter) {
                this.logger.log(`⚠️ EMAIL SIMULÉ pour ${to} (Mode test - aucun email réellement envoyé)`);
                this.logger.log(`⚠️ Les emails ne sont pas envoyés car le système est en mode test`);
                info.messageId = `test-${Date.now()}@test.local`;
            }
            else {
                this.logger.log(`✅ Email envoyé avec succès à ${to} (MessageId: ${info.messageId})`);
            }
            const isProduction = process.env.NODE_ENV === 'production';
            let previewUrl;
            if (isTestTransporter) {
                this.logger.log(`🔗 Mode test activé - aucun email réellement envoyé`);
            }
            else if (isProduction) {
                this.logger.log(`🔗 Email envoyé via SendGrid (production)`);
            }
            else {
                previewUrl = `https://mailtrap.io/inboxes/default/messages`;
                this.logger.log(`🔗 Aperçu Mailtrap: ${previewUrl}`);
            }
            const from = mailOptions.from || 'no-reply@monapp.com';
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
            if (this.sentEmails.length > 50)
                this.sentEmails.length = 50;
            return Object.assign(Object.assign({}, info), { previewUrl: previewUrl });
        }
        catch (error) {
            this.logger.error(`❌ Erreur lors de l'envoi de l'email à ${to}:`, error);
            throw error;
        }
    }
    async sendPresenceConfirmationEmail(data) {
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
        }
        catch (error) {
            this.logger.error(`❌ Erreur lors de l'envoi de l'email de confirmation de présence:`, error);
        }
    }
    getSentEmails() {
        return this.sentEmails;
    }
};
exports.MailService = MailService;
exports.MailService = MailService = MailService_1 = __decorate([
    (0, common_1.Injectable)(),
    __metadata("design:paramtypes", [])
], MailService);
//# sourceMappingURL=mail.service.js.map