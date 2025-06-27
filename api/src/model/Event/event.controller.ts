import { Controller, Get, Post, Body, Patch, Param, Delete, UseGuards, Request, Logger } from '@nestjs/common';
import { EventService } from './services/event.service';
import { CreateEventDto } from './dto/create-event.dto';
import { UpdateEventDto } from './dto/update-event.dto';
import { CreateParticipationDto } from './dto/create-participation.dto';
import { ApiTags, ApiResponse, ApiBearerAuth } from '@nestjs/swagger';
import { JwtAuthGuard } from '@feature/security/guards/jwt-auth.guard';
import { RolesGuard } from '@feature/security/guards/roles.guard';
import { Roles } from '@feature/security/decorators/roles.decorator';
import { UserRole } from '../User/entities/user-role.enum';

@ApiTags('events')
@Controller('events')
@UseGuards(JwtAuthGuard)
@ApiBearerAuth()
export class EventController {
  private readonly logger = new Logger(EventController.name);

  constructor(private readonly eventService: EventService) {}

  @Get()
  @ApiResponse({ status: 200, description: 'Retourne tous les événements' })
  findAll() {
    return this.eventService.findAll();
  }

  @Post()
  @UseGuards(RolesGuard)
  @Roles(UserRole.ADMIN, UserRole.ORGANIZER)
  @ApiResponse({ status: 201, description: 'Événement créé avec succès' })
  async create(@Request() req, @Body() createEventDto: CreateEventDto) {
    // DEBUG: Affichage des données utilisateur lors de la création d'un événement (à activer uniquement en développement)
    // console.log('User data:', req.user);
    return this.eventService.create(createEventDto, req.user.userId);
  }

  @Get('upcoming')
  @ApiResponse({ status: 200, description: 'Retourne les événements à venir' })
  async getUpcomingEvents() {
    this.logger.debug('Getting upcoming events');
    return await this.eventService.getUpcomingEvents();
  }

  @Get('registered')
  @UseGuards(RolesGuard)
  @Roles(UserRole.MEMBER)
  @ApiResponse({ status: 200, description: 'Retourne les événements auxquels le membre est inscrit' })
  async getRegisteredEvents(@Request() req) {
    const userId = req.user.userId;
    this.logger.debug(`Getting registered events for user: ${userId}`);
    return await this.eventService.getRegisteredEvents(userId);
  }

  @Get(':id')
  @ApiResponse({ status: 200, description: 'Retourne un événement par son ID' })
  findOne(@Param('id') id: string) {
    return this.eventService.findOne(id);
  }

  @Patch(':id')
  @UseGuards(RolesGuard)
  @Roles(UserRole.ORGANIZER, UserRole.ADMIN)
  @ApiResponse({ status: 200, description: 'Événement mis à jour avec succès' })
  update(@Param('id') id: string, @Body() updateEventDto: UpdateEventDto) {
    return this.eventService.update(id, updateEventDto);
  }

  @Delete(':id')
  @UseGuards(RolesGuard)
  @Roles(UserRole.ADMIN, UserRole.ORGANIZER)
  @ApiResponse({ status: 200, description: 'Événement supprimé avec succès' })
  async remove(@Param('id') id: string, @Request() req) {
    this.logger.debug(`Suppression de l'événement ${id} demandée par l'utilisateur ${req.user.userId}`);
    return this.eventService.remove(id, req.user.userId, req.user.role);
  }

  @Post(':id/participate')
  @UseGuards(RolesGuard)
  @Roles(UserRole.MEMBER)
  @ApiResponse({ status: 201, description: 'Inscription réussie' })
  @ApiResponse({ status: 409, description: 'Déjà inscrit ou événement complet' })
  async participate(@Request() req, @Param('id') eventId: string) {
    this.logger.debug(`Tentative d'inscription - User: ${req.user.userId}, Event: ${eventId}`);
    
    const result = await this.eventService.participate({
      eventId,
      participantId: req.user.userId
    });

    return {
      code: 'EVENT_PARTICIPATION_SUCCESS',
      message: 'Inscription réussie',
      data: result
    };
  }

  /**
   * Endpoint pour confirmer la présence à un événement (membre)
   * Accessible uniquement si l'utilisateur a payé
   */
  @Post(':id/confirm-presence')
  @UseGuards(RolesGuard)
  @Roles(UserRole.MEMBER)
  @ApiResponse({ status: 200, description: 'Présence confirmée avec succès' })
  @ApiResponse({ status: 403, description: 'Non autorisé - Paiement requis' })
  async confirmPresence(@Request() req, @Param('id') eventId: string) {
    this.logger.debug(`Confirmation de présence - User: ${req.user.userId}, Event: ${eventId}`);
    const result = await this.eventService.confirmPresence(eventId, req.user.userId);
    return {
      code: 'EVENT_PRESENCE_CONFIRMED',
      message: 'Présence confirmée avec succès',
      data: result
    };
  }

  @Patch(':id/cancel')
  @UseGuards(RolesGuard)
  @Roles(UserRole.ADMIN, UserRole.ORGANIZER)
  @ApiResponse({ status: 200, description: "Événement annulé (soft delete) avec succès" })
  /**
   * Annule un événement sans suppression franche (soft delete)
   * Met à jour le champ is_cancelled à true
   */
  async cancelEvent(@Param('id') id: string) {
    return this.eventService.cancelEvent(id);
  }
} 