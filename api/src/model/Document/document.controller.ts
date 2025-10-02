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
  async requestInvoice(@Req() req, @Body() body: { eventId: string, eventTitle?: string }) {
    try {
      const user = req.user;
      const { eventId } = body;
      
      this.logger.log(`🔍 DEBUG: Demande de facture par l'utilisateur ${user.userId} pour l'événement ${eventId}`);
      this.logger.log(`🔍 DEBUG: Body reçu: ${JSON.stringify(body)}`);
      this.logger.log(`🔍 DEBUG: User info: ${JSON.stringify({ userId: user.userId, email: user.email })}`);

      // Vérifier si l'événement existe
      const event = await this.eventRepository.findOne({
        where: { id: eventId }
      });

      this.logger.log(`🔍 DEBUG: Événement trouvé: ${event ? 'OUI' : 'NON'} - ${event?.title || 'N/A'}`);

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

      this.logger.log(`🔍 DEBUG: Participation trouvée: ${participation ? 'OUI' : 'NON'}`);
      if (participation) {
        this.logger.log(`🔍 DEBUG: Statut participation: ${participation.status} - Paiement: ${participation.payment_status}`);
      }

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

      // Si aucune facture n'est trouvée, créer une facture spécifique à l'événement
      if (!invoice || !invoice.file_url || !fs.existsSync(path.resolve(invoice.file_url))) {
        this.logger.log(`🔍 DEBUG: Aucune facture trouvée pour l'utilisateur ${user.userId}, création d'une facture spécifique à l'événement`);
        
        // Générer un nom de fichier unique pour cette facture
        const invoiceId = require('crypto').randomUUID();
        const fileName = `invoice-${invoiceId}.pdf`;
        const filePath = path.join('./uploads/invoices', fileName);
        
        // Créer le dossier s'il n'existe pas
        const invoiceDir = path.dirname(filePath);
        if (!fs.existsSync(invoiceDir)) {
          fs.mkdirSync(invoiceDir, { recursive: true });
        }
        
        // Générer une facture PDF simple
        await this.generateSimpleInvoicePDF(event, user, participation, filePath);
        
        // Créer l'entrée dans la base de données
        const newInvoice = this.documentRepository.create({
          title: `Facture - ${event.title}`,
          description: `Facture pour l'événement ${event.title}`,
          file_url: filePath,
          type: DocumentType.INVOICE,
          uploader: { id: user.userId },
          event: { id: eventId }
        });

        await this.documentRepository.save(newInvoice);
        
        // Utiliser la facture créée
        invoice = await this.documentRepository.findOne({
          where: { id: newInvoice.id }
        });

        this.logger.log(`🔍 DEBUG: Facture créée avec succès: ${invoice?.id} - ${filePath}`);

        if (!invoice || !fs.existsSync(path.resolve(invoice.file_url))) {
          this.logger.error(`Impossible de créer ou trouver une facture pour l'utilisateur ${user.userId}`);
          throw new NotFoundException('Aucune facture trouvée. Veuillez contacter l\'administrateur.');
        }
      }

      // Envoyer la facture par email
      try {
        await this.mailService.sendMail(
          user.email,
          `Facture - ${event.title}`,
          `Bonjour,\n\nVeuillez trouver votre facture pour l'événement "${event.title}" en pièce jointe.\n\nCordialement,\nL'équipe Kiwi Club`,
          undefined,
          [{ filename: `facture_${event.title.replace(/[^a-zA-Z0-9]/g, '_')}.pdf`, path: invoice.file_url }]
        );
        this.logger.log(`✅ Facture envoyée par email à ${user.email}`);
      } catch (emailError) {
        this.logger.error(`❌ Erreur envoi email: ${emailError.message}`);
        // Ne pas faire échouer la requête si l'email échoue
      }

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

  /**
   * Génère une facture PDF complète et professionnelle
   */
  private async generateSimpleInvoicePDF(event: any, user: any, participation: any, filePath: string): Promise<void> {
    try {
      const PDFDocument = require('pdfkit');
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
      doc.fontSize(10).text(`N° ${participation.id || 'INV-' + Date.now()}`, 400, 40, { align: 'right' });
      doc.text(`Date: ${new Date().toLocaleDateString('fr-FR')}`, 400, 55, { align: 'right' });

      // Ligne de séparation
      doc.moveTo(50, 100).lineTo(545, 100).stroke(primaryColor, 2);

      // Informations du client
      doc.moveDown(2);
      doc.fillColor(primaryColor);
      doc.fontSize(14).text('FACTURÉ À:', 50, 120);
      doc.fillColor('black');
      doc.fontSize(12).text(`${user.prenom || ''} ${user.nom || ''}`, 50, 140);
      doc.text(`${user.email || 'N/A'}`, 50, 155);
      if (user.telephone) {
        doc.text(`Tél: ${user.telephone}`, 50, 170);
      }
      if (user.entreprise) {
        doc.text(`Entreprise: ${user.entreprise}`, 50, 185);
      }

      // Détails de l'événement
      doc.moveDown(2);
      doc.fillColor(primaryColor);
      doc.fontSize(14).text('DÉTAILS DE L\'ÉVÉNEMENT:', 50, 220);
      doc.fillColor('black');
      doc.fontSize(12).text(`${event.title || 'N/A'}`, 50, 240);
      doc.text(`Date: ${event.date ? new Date(event.date).toLocaleDateString('fr-FR') : 'N/A'}`, 50, 255);
      doc.text(`Heure: ${event.startTime || 'N/A'} - ${event.endTime || 'N/A'}`, 50, 270);
      doc.text(`Lieu: ${event.location || 'N/A'}`, 50, 285);
      if (event.description) {
        doc.text(`Description: ${event.description.substring(0, 100)}${event.description.length > 100 ? '...' : ''}`, 50, 300);
      }

      // Tableau des services
      doc.moveDown(2);
      const tableTop = 350;
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
      doc.fontSize(10).text(`Participation à l'événement "${event.title}"`, col1 + 10, tableTop + itemHeight + 10);
      doc.text('1', col2 + 20, tableTop + itemHeight + 10);
      doc.text(`${event.price || 0}€`, col3 + 10, tableTop + itemHeight + 10);
      doc.text(`${event.price || 0}€`, col4 + 10, tableTop + itemHeight + 10);

      // Sous-total et TVA
      const subtotalY = tableTop + (itemHeight * 2) + 20;
      doc.fontSize(12).text(`Sous-total: ${event.price || 0}€`, col3, subtotalY);
      doc.text(`TVA (21%): ${((event.price || 0) * 0.21).toFixed(2)}€`, col3, subtotalY + 20);
      
      // Total
      const totalY = subtotalY + 50;
      doc.rect(col3, totalY - 10, 145, 30).fill(lightGray);
      doc.fillColor(primaryColor);
      doc.fontSize(14).text(`TOTAL: ${((event.price || 0) * 1.21).toFixed(2)}€`, col3 + 10, totalY);

      // Informations de paiement
      doc.fillColor('black');
      doc.moveDown(3);
      doc.fontSize(12).text('INFORMATIONS DE PAIEMENT:', 50, totalY + 50);
      doc.fontSize(10).text(`Statut: ${participation.paymentStatus || 'PAID'}`, 50, totalY + 70);
      doc.text(`Date de paiement: ${participation.paymentDate ? new Date(participation.paymentDate).toLocaleDateString('fr-FR') : new Date().toLocaleDateString('fr-FR')}`, 50, totalY + 85);
      doc.text(`Méthode: Stripe`, 50, totalY + 100);

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
      this.logger.error(`Erreur lors de la génération de la facture PDF: ${error.message}`);
      throw error;
    }
  }
} 