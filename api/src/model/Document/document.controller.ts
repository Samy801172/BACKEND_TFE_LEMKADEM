import { Controller, Get, Param, Res, NotFoundException, UseGuards, Req, Post, InternalServerErrorException } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { Document, DocumentType } from './entities/document.entity';
import { Response } from 'express';
import * as fs from 'fs';
import * as path from 'path';
import { JwtAuthGuard } from '@feature/security/guards/jwt-auth.guard';
import { MailService } from '../../common/services/mail.service';
import { Logger } from '@nestjs/common';

@Controller('documents')
export class DocumentController {
  private readonly logger = new Logger(DocumentController.name);

  constructor(
    @InjectRepository(Document)
    private readonly documentRepository: Repository<Document>,
    private readonly mailService: MailService
  ) {}

  @Get(':id/download')
  async downloadDocument(@Param('id') id: string, @Res() res: Response) {
    try {
      this.logger.log(`Tentative de téléchargement du document ${id}`);
      
      const document = await this.documentRepository.findOne({ where: { id } });
      if (!document) {
        this.logger.error(`Document non trouvé: ${id}`);
        throw new NotFoundException('Document non trouvé');
      }

      const filePath = path.resolve(document.file_url);
      this.logger.log(`Chemin du fichier: ${filePath}`);

      if (!fs.existsSync(filePath)) {
        this.logger.error(`Fichier introuvable: ${filePath}`);
        throw new NotFoundException('Fichier de la facture introuvable');
      }

      res.setHeader('Content-Type', 'application/pdf');
      res.setHeader('Content-Disposition', `attachment; filename="${path.basename(filePath)}"`);
      
      const fileStream = fs.createReadStream(filePath);
      fileStream.on('error', (error) => {
        this.logger.error(`Erreur lors de la lecture du fichier: ${error.message}`);
        throw new InternalServerErrorException('Erreur lors de la lecture du fichier');
      });

      fileStream.pipe(res);
      this.logger.log(`Document ${id} téléchargé avec succès`);
    } catch (error) {
      this.logger.error(`Erreur lors du téléchargement: ${error.message}`);
      throw error;
    }
  }

  @Get('last-invoice')
  @UseGuards(JwtAuthGuard)
  async getLastInvoice(@Req() req, @Res() res: Response) {
    try {
      const userId = req.user.userId;
      this.logger.log(`Recherche de la dernière facture pour l'utilisateur ${userId}`);

      // Correction : on rend la requête compatible avec les anciennes données où 'uploader' peut être soit une relation (User), soit juste un id (string)
      // Cela permet d'éviter les 404 si la facture existe mais que le champ uploader n'est pas une vraie relation ManyToOne
      const lastInvoice = await this.documentRepository.findOne({
        where: [
          { uploader: { id: userId }, type: DocumentType.INVOICE }, // cas normal (relation)
          { uploader: userId, type: DocumentType.INVOICE }           // cas legacy (id simple)
        ],
        order: { id: 'DESC' }
      });

      if (!lastInvoice) {
        this.logger.error(`Aucune facture trouvée pour l'utilisateur ${userId}`);
        throw new NotFoundException('Aucune facture trouvée');
      }

      const filePath = path.resolve(lastInvoice.file_url);
      this.logger.log(`Chemin du fichier: ${filePath}`);

      if (!fs.existsSync(filePath)) {
        this.logger.error(`Fichier introuvable: ${filePath}`);
        throw new NotFoundException('Fichier de la facture introuvable');
      }

      res.setHeader('Content-Type', 'application/pdf');
      res.setHeader('Content-Disposition', `attachment; filename="${path.basename(filePath)}"`);
      
      const fileStream = fs.createReadStream(filePath);
      fileStream.on('error', (error) => {
        this.logger.error(`Erreur lors de la lecture du fichier: ${error.message}`);
        throw new InternalServerErrorException('Erreur lors de la lecture du fichier');
      });

      fileStream.pipe(res);
      this.logger.log(`Dernière facture téléchargée avec succès pour l'utilisateur ${userId}`);
    } catch (error) {
      this.logger.error(`Erreur lors du téléchargement de la dernière facture: ${error.message}`);
      throw error;
    }
  }

  /**
   * Endpoint pour réclamer une facture :
   * - Vérifie l'utilisateur connecté (JWT)
   * - Cherche la dernière facture (DocumentType.INVOICE)
   * - Envoie la facture par email via Mailtrap
   * - Retourne un message de succès
   */
  @Post('request-invoice')
  @UseGuards(JwtAuthGuard)
  async requestInvoice(@Req() req) {
    try {
      const user = req.user;
      this.logger.log(`Demande de facture par l'utilisateur ${user.userId}`);

      const lastInvoice = await this.documentRepository.findOne({
        where: { uploader: { id: user.userId }, type: DocumentType.INVOICE },
        order: { id: 'DESC' }
      });

      // Vérification robuste : document ET fichier doivent exister
      if (!lastInvoice || !lastInvoice.file_url || !fs.existsSync(path.resolve(lastInvoice.file_url))) {
        this.logger.error(`Aucune facture exploitable trouvée pour l'utilisateur ${user.userId}`);
        throw new NotFoundException('Aucune facture trouvée');
      }

      await this.mailService.sendMail(
        user.email,
        'Votre facture',
        'Veuillez trouver votre facture en pièce jointe.',
        undefined,
        [{ filename: 'facture.pdf', path: lastInvoice.file_url }]
      );

      this.logger.log(`Facture envoyée par email à ${user.email}`);
      return { message: 'Facture envoyée par email.' };
    } catch (error) {
      this.logger.error(`Erreur lors de l'envoi de la facture: ${error.message}`);
      throw error;
    }
  }
} 