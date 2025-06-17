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
import { Brackets } from 'typeorm';

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

      const lastInvoice = await this.documentRepository
        .createQueryBuilder('document')
        .where('document.type = :type', { type: DocumentType.INVOICE })
        .andWhere(new Brackets(qb => {
          qb.where('document.uploader = :userId', { userId })
            .orWhere('document.uploader_id = :userId', { userId });
        }))
        .orderBy('document.createdAt', 'DESC')
        .getOne();

      if (!lastInvoice) {
        this.logger.warn(`Aucune facture trouvée pour l'utilisateur ${userId}`);
        throw new NotFoundException('Aucune facture trouvée');
      }

      const filePath = path.resolve(lastInvoice.file_url);
      this.logger.log(`Chemin du fichier: ${filePath}`);

      if (!fs.existsSync(filePath)) {
        this.logger.error(`Fichier introuvable: ${filePath}`);
        throw new NotFoundException('Fichier de la facture introuvable');
      }

      res.setHeader('Content-Type', 'application/pdf');
      res.setHeader('Content-Disposition', `attachment; filename="facture.pdf"`);
      
      const fileStream = fs.createReadStream(filePath);
      fileStream.on('error', (error) => {
        this.logger.error(`Erreur lors de la lecture du fichier: ${error.message}`);
        throw new InternalServerErrorException('Erreur lors de la lecture du fichier');
      });

      fileStream.pipe(res);
      this.logger.log(`Facture envoyée avec succès pour l'utilisateur ${userId}`);
    } catch (error) {
      this.logger.error(`Erreur lors de la récupération de la facture: ${error.message}`);
      if (error instanceof NotFoundException) {
        throw error;
      }
      throw new InternalServerErrorException('Erreur lors de la récupération de la facture');
    }
  }

  @Post('request-invoice')
  @UseGuards(JwtAuthGuard)
  async requestInvoice(@Req() req) {
    try {
      const userId = req.user.userId;
      const userEmail = req.user.email;
      this.logger.log(`Demande de facture par l'utilisateur ${userId}`);

      const lastInvoice = await this.documentRepository
        .createQueryBuilder('document')
        .where('document.type = :type', { type: DocumentType.INVOICE })
        .andWhere(new Brackets(qb => {
          qb.where('document.uploader = :userId', { userId })
            .orWhere('document.uploader_id = :userId', { userId });
        }))
        .orderBy('document.createdAt', 'DESC')
        .getOne();

      if (!lastInvoice || !lastInvoice.file_url) {
        this.logger.error(`Aucune facture trouvée pour l'utilisateur ${userId}`);
        throw new NotFoundException('Aucune facture trouvée');
      }

      const filePath = path.resolve(lastInvoice.file_url);
      if (!fs.existsSync(filePath)) {
        this.logger.error(`Fichier introuvable: ${filePath}`);
        throw new NotFoundException('Fichier de la facture introuvable');
      }

      await this.mailService.sendMail(
        userEmail,
        'Votre facture',
        'Veuillez trouver votre facture en pièce jointe.',
        undefined,
        [{ filename: 'facture.pdf', path: filePath }]
      );

      this.logger.log(`Facture envoyée par email à ${userEmail}`);
      return { message: 'Facture envoyée par email avec succès.' };
    } catch (error) {
      this.logger.error(`Erreur lors de l'envoi de la facture: ${error.message}`);
      if (error instanceof NotFoundException) {
        throw error;
      }
      throw new InternalServerErrorException('Erreur lors de l\'envoi de la facture');
    }
  }
} 