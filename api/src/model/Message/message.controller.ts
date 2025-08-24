import { Controller, Get, Post, Body, Param, UseGuards, Request, Req, Query, Delete, Patch } from '@nestjs/common';
import { MessageService } from './message.service';
import { CreateMessageDto } from './dto/create-message.dto';
import { ApiTags, ApiResponse, ApiBearerAuth, ApiQuery } from '@nestjs/swagger';
import { JwtAuthGuard } from '@feature/security/guards/jwt-auth.guard';

@ApiTags('messages')
@Controller('messages')
@UseGuards(JwtAuthGuard)
@ApiBearerAuth()
export class MessageController {
  constructor(private readonly messageService: MessageService) {}

  @Post()
  @ApiResponse({ status: 201, description: 'Message sent successfully' })
  create(@Request() req, @Body() createMessageDto: CreateMessageDto) {
    return this.messageService.create(req.user.userId, createMessageDto);
  }

  @Get()
  @ApiResponse({ status: 200, description: 'Return all messages for the user' })
  @ApiQuery({ name: 'page', required: false, type: Number })
  @ApiQuery({ name: 'limit', required: false, type: Number })
  findAll(
    @Request() req, 
    @Query('page') page?: number, 
    @Query('limit') limit?: number
  ) {
    return this.messageService.findAll(
      req.user.userId, 
      { page: page || 1, limit: limit || 10 }
    );
  }

  /**
   * IMPORTANT : Les routes spécifiques doivent être déclarées avant les routes dynamiques (ex: ':id')
   * Sinon, /messages/received ou /messages/sent seront interprétées comme des IDs !
   */

  /**
   * Récupère tous les messages reçus par l'utilisateur connecté
   * @returns Liste des messages reçus
   */
  @ApiResponse({ status: 200, description: "Messages reçus par l'utilisateur connecté" })
  @Get('received')
  getReceivedMessages(@Request() req) {
    return this.messageService.getReceivedMessages(req.user.userId);
  }

  /**
   * Récupère tous les messages envoyés par l'utilisateur connecté
   * @returns Liste des messages envoyés
   */
  @ApiResponse({ status: 200, description: "Messages envoyés par l'utilisateur connecté" })
  @Get('sent')
  getSentMessages(@Request() req) {
    return this.messageService.getSentMessages(req.user.userId);
  }

  /**
   * Récupère la liste des conversations de l'utilisateur
   * @returns Liste des conversations avec le dernier message et nombre de non lus
   */
  @Get('conversations')
  @ApiResponse({ status: 200, description: 'Retourne toutes les conversations de l\'utilisateur' })
  async getConversations(@Req() req) {
    return this.messageService.getConversations(req.user.userId);
  }

  /**
   * Récupère les messages échangés avec un contact spécifique
   * @param contactId ID du contact
   * @returns Liste des messages de la conversation
   */
  @Get('conversation/:contactId')
  @ApiResponse({ status: 200, description: 'Retourne tous les messages d\'une conversation' })
  @ApiQuery({ name: 'page', required: false, type: Number })
  @ApiQuery({ name: 'limit', required: false, type: Number })
  async getConversationMessages(
    @Req() req, 
    @Param('contactId') contactId: string,
    @Query('page') page?: number, 
    @Query('limit') limit?: number
  ) {
    return this.messageService.getConversationMessages(
      req.user.userId, 
      contactId,
      { page: page || 1, limit: limit || 20 }
    );
  }

  /**
   * Récupère tous les messages non lus de l'utilisateur
   * @returns Liste des messages non lus
   */
  @Get('unread')
  @ApiResponse({ status: 200, description: 'Retourne tous les messages non lus' })
  async getUnreadMessages(@Req() req) {
    return this.messageService.findUnread(req.user.userId);
  }

  @Get(':id')
  @ApiResponse({ status: 200, description: 'Return a message by id' })
  findOne(@Param('id') id: string) {
    return this.messageService.findOne(id);
  }

  @Post(':id/read')
  @ApiResponse({ status: 200, description: 'Mark message as read' })
  markAsRead(@Param('id') id: string) {
    return this.messageService.markAsRead(id);
  }

  /**
   * Supprime un message
   * Note: La suppression est réservée à l'expéditeur du message
   * @param id ID du message à supprimer
   * @returns Confirmation de suppression
   */
  @Delete(':id')
  @ApiResponse({ status: 200, description: 'Message supprimé avec succès' })
  async deleteMessage(@Req() req, @Param('id') id: string) {
    return this.messageService.deleteMessage(req.user.userId, id);
  }

  /**
   * Marque tous les messages d'une conversation comme lus
   * @param contactId ID du contact dont on veut marquer les messages comme lus
   * @returns Nombre de messages marqués comme lus
   */
  @Patch('conversation/:contactId/read-all')
  @ApiResponse({ status: 200, description: 'Tous les messages marqués comme lus' })
  async markAllAsRead(@Req() req, @Param('contactId') contactId: string) {
    return this.messageService.markAllAsRead(req.user.userId, contactId);
  }
} 