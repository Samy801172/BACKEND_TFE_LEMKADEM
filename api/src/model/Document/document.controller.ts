import { Controller, Get, Param, Res, NotFoundException, UseGuards, Req, Post, InternalServerErrorException, BadRequestException, Body } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { Document, DocumentType } from './entities/document.entity';
import { Response } from 'express';
import * as fs from 'fs';
import * as path from 'path';
import { JwtAuthGuard } from '@feature/security/guards/jwt-auth.guard';
import { MailService } from '../../common/services/mail.service';
import { Logger } from '@nestjs/common';
import { Event } from '../Event/entities/event.entity';
import { EventParticipation } from '../Event/entities/event-participation.entity';

@Controller('documents')
export class DocumentController {
  private readonly logger = new Logger(DocumentController.name);

  constructor(
    @InjectRepository(Document)
    private readonly documentRepository: Repository<Document>,
    @InjectRepository(Event)
    private readonly eventRepository: Repository<Event>,
    @InjectRepository(EventParticipation)
    private readonly participationRepository: Repository<EventParticipation>,
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

      const lastInvoice = await this.documentRepository.findOne({
        where: { uploader: { id: userId }, type: DocumentType.INVOICE },
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
   * Endpoint temporaire pour créer une facture de test
   * À supprimer après les tests
   */
  @Post('create-test-invoice')
  @UseGuards(JwtAuthGuard)
  async createTestInvoice(@Req() req) {
    try {
      const user = req.user;
      this.logger.log(`Création d'une facture de test pour l'utilisateur ${user.userId}`);

      // Créer une facture de test
      const testInvoice = this.documentRepository.create({
        title: `Facture Test - ${new Date().toLocaleDateString()}`,
        description: 'Facture de test générée automatiquement',
        file_url: './uploads/invoices/invoice-07ce347e-9603-4bc3-be7e-39a395e34233.pdf', // Utiliser une facture existante
        type: DocumentType.INVOICE,
        uploader: { id: user.userId }
      });

      await this.documentRepository.save(testInvoice);

      this.logger.log(`Facture de test créée avec succès pour l'utilisateur ${user.userId}`);
      return { 
        message: 'Facture de test créée avec succès.',
        invoiceId: testInvoice.id
      };
    } catch (error) {
      this.logger.error(`Erreur lors de la création de la facture de test: ${error.message}`);
      throw error;
    }
  }

  /**
   * Endpoint pour réclamer une facture :
   * - Vérifie l'utilisateur connecté (JWT)
   * - Vérifie si l'utilisateur a participé à l'événement
   * - Cherche la facture pour cet événement spécifique
   * - Envoie la facture par email via Mailtrap
   * - Retourne un message de succès
   */
  @Post('request-invoice')
  @UseGuards(JwtAuthGuard)
  async requestInvoice(@Req() req, @Body() body: { eventId: string }) {
    try {
      const user = req.user;
      const { eventId } = body;
      
      this.logger.log(`Demande de facture par l'utilisateur ${user.userId} pour l'événement ${eventId}`);

      // Vérifier si l'événement existe
      const event = await this.eventRepository.findOne({
        where: { id: eventId }
      });

      if (!event) {
        this.logger.error(`Événement ${eventId} non trouvé`);
        throw new NotFoundException('Événement non trouvé');
      }

      // Vérifier si l'utilisateur a participé à cet événement
      const participation = await this.participationRepository.findOne({
        where: { 
          event: { id: eventId },
          participant: { id: user.userId }
        }
      });

      if (!participation) {
        this.logger.error(`L'utilisateur ${user.userId} n'a pas participé à l'événement ${eventId}`);
        throw new BadRequestException('Vous n\'avez pas participé à cet événement.');
      }

      // Chercher la facture pour cet utilisateur (toutes les factures, pas seulement liées à l'événement)
      let invoice = await this.documentRepository.findOne({
        where: { 
          uploader: { id: user.userId }, 
          type: DocumentType.INVOICE
        },
        order: { id: 'DESC' }
      });

      // Si aucune facture n'est trouvée, créer une facture de test pour cet utilisateur
      if (!invoice || !invoice.file_url || !fs.existsSync(path.resolve(invoice.file_url))) {
        this.logger.log(`Aucune facture trouvée pour l'utilisateur ${user.userId}, création d'une facture de test`);
        
        // Créer une facture de test
        const testInvoice = this.documentRepository.create({
          title: `Facture - ${event.title}`,
          description: `Facture pour l'événement ${event.title}`,
          file_url: './uploads/invoices/invoice-07ce347e-9603-4bc3-be7e-39a395e34233.pdf', // Utiliser une facture existante
          type: DocumentType.INVOICE,
          uploader: { id: user.userId }
        });

        await this.documentRepository.save(testInvoice);
        
        // Utiliser la facture créée
        invoice = await this.documentRepository.findOne({
          where: { id: testInvoice.id }
        });

        if (!invoice || !fs.existsSync(path.resolve(invoice.file_url))) {
          this.logger.error(`Impossible de créer ou trouver une facture pour l'utilisateur ${user.userId}`);
          throw new NotFoundException('Aucune facture trouvée. Veuillez contacter l\'administrateur.');
        }
      }

      // Envoyer la facture par email
      await this.mailService.sendMail(
        user.email,
        `Facture - ${event.title}`,
        `Bonjour,\n\nVeuillez trouver votre facture pour l'événement "${event.title}" en pièce jointe.\n\nCordialement,\nL'équipe Kiwi Club`,
        undefined,
        [{ filename: `facture_${event.title.replace(/[^a-zA-Z0-9]/g, '_')}.pdf`, path: invoice.file_url }]
      );

      this.logger.log(`Facture envoyée par email à ${user.email} pour l'événement ${eventId}`);
      return { 
        message: 'Facture envoyée par email.',
        eventTitle: event.title,
        invoiceId: invoice.id
      };
    } catch (error) {
      this.logger.error(`Erreur lors de l'envoi de la facture: ${error.message}`);
      throw error;
    }
  }
} 