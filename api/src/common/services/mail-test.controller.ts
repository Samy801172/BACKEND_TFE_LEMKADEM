import { Controller, Get, Post, Body, Query, Res } from '@nestjs/common';
import { Response } from 'express';
import { MailService } from './mail.service';
import { ApiTags, ApiOperation } from '@nestjs/swagger';

interface EmailPreview {
  id: string;
  from: string;
  to: string;
  subject: string;
  text: string;
  html: string;
  timestamp: Date;
  previewUrl: string;
}

@ApiTags('mail-test')
@Controller('mail-test')
export class MailTestController {
  constructor(private readonly mailService: MailService) {}

  /**
   * Retourne la liste réelle des emails envoyés
   * On utilise @Res() pour court-circuiter l'interceptor global
   * et retourner un tableau pur (Array) attendu par Angular
   */
  @Get('preview')
  @ApiOperation({ summary: 'Récupère la liste des emails Mailtrap (tableau pur)' })
  async getEmailPreviews(@Res() res: Response) {
    // Retourne un tableau pur, pas d'objet { data: ... }
    return res.json(this.mailService.getSentEmails());
  }

  @Post('send-test')
  @ApiOperation({ summary: 'Envoie un email de test' })
  async sendTestEmail(@Body() data: { to: string; subject: string; message: string }) {
    try {
      const result = await this.mailService.sendMail(
        data.to,
        data.subject,
        data.message,
        `<h1>${data.subject}</h1><p>${data.message}</p>`
      );
      return { success: true, messageId: result.messageId, previewUrl: result.previewUrl };
    } catch (error) {
      return { success: false, error: error.message };
    }
  }

  @Get('mailtrap-urls')
  @ApiOperation({ summary: 'Récupère les URLs Mailtrap récentes' })
  async getMailtrapUrls(): Promise<string[]> {
    // URL Mailtrap pour visualiser les emails
    const inboxId = process.env.MAILTRAP_INBOX_ID || 'default';
    return [
      `https://mailtrap.io/inboxes/${inboxId}/messages`,
      `https://mailtrap.io/inboxes/${inboxId}/settings`
    ];
  }
} 