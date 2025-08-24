import { Controller, Post, Get, Body, Request, UseGuards, Param, Delete, Patch } from '@nestjs/common';
import { ContactService } from './contact.service';
import { JwtAuthGuard } from '@feature/security/guards/jwt-auth.guard';

@Controller('contacts')
@UseGuards(JwtAuthGuard)
export class ContactController {
  constructor(private readonly contactService: ContactService) {}

  /**
   * Envoi d'une demande de contact (façon LinkedIn)
   * L'utilisateur connecté (req.user.userId) envoie une demande à contactId.
   * Si la demande n'existe pas déjà, elle est enregistrée avec le statut PENDING.
   */
  @Post()
  async addContact(@Request() req, @Body('contactId') contactId: string) {
    return this.contactService.sendContactRequest(req.user.userId, contactId);
  }

  /**
   * Récupération de la liste des contacts acceptés pour l'utilisateur connecté.
   * Seuls les contacts avec le statut ACCEPTED sont retournés.
   */
  @Get()
  async getContacts(@Request() req) {
    return this.contactService.getContacts(req.user.userId);
  }

  /**
   * Suppression d'un contact (et de la relation réciproque si elle existe).
   * Seul le propriétaire ou le destinataire peut supprimer la relation.
   */
  @Delete(':id')
  async deleteContact(@Request() req, @Param('id') relationId: string) {
    return this.contactService.deleteContact(req.user.userId, relationId);
  }

  /**
   * Acceptation d'une demande de contact reçue.
   * Passe le statut à ACCEPTED et crée la relation réciproque si besoin.
   */
  @Patch('accept/:id')
  async acceptContact(@Request() req, @Param('id') requestId: string) {
    return this.contactService.acceptContactRequest(req.user.userId, requestId);
  }

  /**
   * Refus d'une demande de contact reçue.
   * Passe le statut à REFUSED, la relation n'est pas créée.
   */
  @Patch('refuse/:id')
  async refuseContact(@Request() req, @Param('id') requestId: string) {
    return this.contactService.refuseContactRequest(req.user.userId, requestId);
  }

  /**
   * Récupération des demandes de contact en attente reçues par l'utilisateur connecté.
   * Permet d'afficher les invitations à accepter ou refuser.
   */
  @Get('pending')
  async getPendingRequests(@Request() req) {
    return this.contactService.getPendingRequests(req.user.userId);
  }
} 