import { Controller, Get, Post, Body, Patch, Param, Delete, UseGuards, Request, Logger, NotFoundException, ForbiddenException, UseInterceptors, UploadedFile, Req } from '@nestjs/common';
import { EventService } from './services/event.service';
import { CreateEventDto } from './dto/create-event.dto';
import { UpdateEventDto } from './dto/update-event.dto';
import { CreateParticipationDto } from './dto/create-participation.dto';
import { ApiTags, ApiResponse, ApiBearerAuth } from '@nestjs/swagger';
import { JwtAuthGuard } from '@feature/security/guards/jwt-auth.guard';
import { RolesGuard } from '@feature/security/guards/roles.guard';
import { Roles } from '@feature/security/decorators/roles.decorator';
import { UserRole } from '../User/entities/user-role.enum';
import { FileInterceptor } from '@nestjs/platform-express';
import { diskStorage } from 'multer';
import * as path from 'path';

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

  @Get('my-events')
  @ApiResponse({ status: 200, description: 'Retourne les événements auxquels l\'utilisateur est inscrit' })
  async getMyEvents(@Request() req) {
    const userId = req.user.userId;
    this.logger.debug(`Getting my events for user: ${userId}`);
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

  @Delete(':id/unregister')
  @UseGuards(RolesGuard)
  @Roles(UserRole.MEMBER)
  @ApiResponse({ status: 200, description: 'Participation annulée avec succès' })
  @ApiResponse({ status: 404, description: 'Participation non trouvée' })
  async unregister(@Request() req, @Param('id') eventId: string) {
    this.logger.debug(`Annulation de participation - User: ${req.user.userId}, Event: ${eventId}`);
    
    const result = await this.eventService.unregister(eventId, req.user.userId);
    return {
      code: 'EVENT_UNREGISTER_SUCCESS',
      message: 'Participation annulée avec succès',
      data: result
    };
  }

  @Post(':id/cancel')
  @UseGuards(RolesGuard)
  @Roles(UserRole.ADMIN, UserRole.ORGANIZER)
  @ApiResponse({ status: 200, description: "Événement annulé (soft delete) avec succès" })
  /**
   * Annule un événement sans suppression franche (soft delete)
   * Met à jour le champ is_cancelled à true
   */
  async cancelEvent(@Param('id') id: string) {
    this.logger.log(`🚨 [EventController] ANNULATION ÉVÉNEMENT DEMANDÉE - ID: ${id}`);
    const result = await this.eventService.cancelEvent(id);
    this.logger.log(`✅ [EventController] ANNULATION TERMINÉE - Résultat: ${JSON.stringify(result)}`);
    return result;
  }

  /**
   * Endpoint pour confirmer la présence à un événement (membre)
   * Accessible uniquement si l'utilisateur a payé
   * Retourne toujours success: true si la confirmation est enregistrée, même si l'email échoue
   */
  @Post(':id/confirm-presence')
  @UseGuards(RolesGuard)
  @Roles(UserRole.MEMBER)
  @ApiResponse({ status: 200, description: 'Présence confirmée avec succès' })
  @ApiResponse({ status: 403, description: 'Non autorisé - Paiement requis' })
  async confirmPresence(@Request() req, @Param('id') eventId: string) {
    this.logger.debug(`Confirmation de présence - User: ${req.user.userId}, Event: ${eventId}`);
    await this.eventService.confirmPresence(eventId, req.user.userId);
    // Toujours retourner success: true même si l'email échoue
    return {
      success: true,
      message: 'Présence confirmée avec succès'
    };
  }

  /**
   * Génère les liens de calendrier pour un événement (Google Calendar, Outlook, etc.)
   * Accessible uniquement si l'utilisateur a payé pour l'événement
   */
  @Get(':id/calendar-links')
  @UseGuards(RolesGuard)
  @Roles(UserRole.MEMBER)
  @ApiResponse({ status: 200, description: 'Liens de calendrier générés' })
  @ApiResponse({ status: 403, description: 'Non autorisé - Paiement requis' })
  async getCalendarLinks(@Request() req, @Param('id') eventId: string) {
    try {
      this.logger.debug(`Génération des liens de calendrier - User: ${req.user.userId}, Event: ${eventId}`);
      
      const event = await this.eventService.findOne(eventId);
      if (!event) {
        throw new NotFoundException('Événement non trouvé');
      }

      // Vérifier que l'utilisateur a payé pour cet événement
      const participation = await this.eventService.getParticipation(eventId, req.user.userId);
      this.logger.debug(`Participation trouvée:`, participation);
      this.logger.debug(`Payment status: ${participation?.payment_status}, Type: ${typeof participation?.payment_status}`);
      
      if (!participation || participation.payment_status !== 'PAID') {
        this.logger.debug(`Accès refusé - Participation: ${!!participation}, Payment status: ${participation?.payment_status}`);
        throw new ForbiddenException('Vous devez avoir payé pour cet événement pour accéder aux liens de calendrier');
      }

      // Générer les liens de calendrier
      const startDate = new Date(event.date);
      const endDate = new Date(startDate.getTime() + 2 * 60 * 60 * 1000); // +2 heures par défaut
      
      const formatDate = (date: Date) => {
        return date.toISOString().replace(/-|:|\.\d+/g, '');
      };

      const calendarLinks = {
        google: `https://www.google.com/calendar/render?action=TEMPLATE&text=${encodeURIComponent(event.title)}&details=${encodeURIComponent(event.description)}&location=${encodeURIComponent(event.location)}&dates=${formatDate(startDate)}/${formatDate(endDate)}`,
        outlook: `https://outlook.live.com/calendar/0/deeplink/compose?subject=${encodeURIComponent(event.title)}&body=${encodeURIComponent(event.description)}&location=${encodeURIComponent(event.location)}&startdt=${startDate.toISOString()}&enddt=${endDate.toISOString()}`,
        ics: `data:text/calendar;charset=utf8,BEGIN:VCALENDAR%0D%0AVERSION:2.0%0D%0ABEGIN:VEVENT%0D%0ADTSTART:${formatDate(startDate)}%0D%0ADTEND:${formatDate(endDate)}%0D%0ASUMMARY:${encodeURIComponent(event.title)}%0D%0ADESCRIPTION:${encodeURIComponent(event.description)}%0D%0ALOCATION:${encodeURIComponent(event.location)}%0D%0AEND:VEVENT%0D%0AEND:VCALENDAR`
      };

      const response = {
        success: true,
        data: {
          event: {
            id: event.id,
            title: event.title,
            description: event.description,
            location: event.location,
            date: event.date
          },
          calendarLinks
        }
      };
      
      this.logger.debug(`Liens de calendrier générés:`, response);
      return response;
    } catch (error) {
      this.logger.error(`Erreur lors de la génération des liens de calendrier:`, error);
      throw error;
    }
  }

  @Post('upload-image')
  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles(UserRole.ADMIN, UserRole.ORGANIZER)
  @UseInterceptors(FileInterceptor('image', {
    storage: diskStorage({
      destination: './uploads/events',
      filename: (req: any, file, cb) => {
        const ext = path.extname(file.originalname);
        const eventId = 'temp-' + Date.now();
        cb(null, eventId + ext);
      }
    })
  }))
  async uploadEventImage(@UploadedFile() file: any, @Req() req) {
    // Génère l'URL dynamique pour l'image d'événement
    const imageUrl = `/api/files/events/${file.filename}`;
    return { 
      code: 'api.common.success',
      data: { 
        image_url: imageUrl 
      },
      result: true 
    };
  }

  /**
   * Ajoute un événement à l'agenda de l'utilisateur
   */
  @Post(':id/add-to-agenda')
  @UseGuards(JwtAuthGuard)
  async addToAgenda(@Param('id') eventId: string, @Request() req) {
    try {
      const userId = req.user.id;
      const participation = await this.eventService.addToAgenda(eventId, userId);
      
      return {
        code: 'api.common.success',
        data: {
          participation: {
            id: participation.id,
            status: participation.status,
            added_to_agenda_at: participation.added_to_agenda_at
          }
        },
        result: true
      };
    } catch (error) {
      this.logger.error(`Erreur lors de l'ajout à l'agenda:`, error);
      throw error;
    }
  }

  /**
   * Retire un événement de l'agenda de l'utilisateur
   */
  @Delete(':id/remove-from-agenda')
  @UseGuards(JwtAuthGuard)
  async removeFromAgenda(@Param('id') eventId: string, @Request() req) {
    try {
      const userId = req.user.id;
      const participation = await this.eventService.removeFromAgenda(eventId, userId);
      
      return {
        code: 'api.common.success',
        data: {
          participation: {
            id: participation.id,
            status: participation.status,
            added_to_agenda_at: participation.added_to_agenda_at
          }
        },
        result: true
      };
    } catch (error) {
      this.logger.error(`Erreur lors du retrait de l'agenda:`, error);
      throw error;
    }
  }

  /**
   * Vérifie si un événement est dans l'agenda de l'utilisateur
   */
  @Get(':id/agenda-status')
  @UseGuards(JwtAuthGuard)
  async getAgendaStatus(@Param('id') eventId: string, @Request() req) {
    try {
      const userId = req.user.id;
      const isInAgenda = await this.eventService.isInAgenda(eventId, userId);
      
      return {
        code: 'api.common.success',
        data: {
          is_in_agenda: isInAgenda
        },
        result: true
      };
    } catch (error) {
      this.logger.error(`Erreur lors de la vérification de l'agenda:`, error);
      throw error;
    }
  }

  /**
   * Traite un paiement avec protection contre les doublons
   */
  @Post(':id/process-payment')
  @UseGuards(JwtAuthGuard)
  async processPayment(
    @Param('id') eventId: string, 
    @Request() req,
    @Body() body: { payment_intent_id: string }
  ) {
    try {
      const userId = req.user.id;
      const { payment_intent_id } = body;
      
      const participation = await this.eventService.processPayment(eventId, userId, payment_intent_id);
      
      return {
        code: 'api.common.success',
        data: {
          participation: {
            id: participation.id,
            payment_status: participation.payment_status,
            payment_intent_id: participation.payment_intent_id,
            last_payment_attempt_at: participation.last_payment_attempt_at,
            payment_attempts_count: participation.payment_attempts_count
          }
        },
        result: true
      };
    } catch (error) {
      this.logger.error(`Erreur lors du traitement du paiement:`, error);
      throw error;
    }
  }
} 