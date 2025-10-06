import { Injectable, ForbiddenException, NotFoundException, ConflictException } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { Event } from '../entities/event.entity';
import { EventParticipation, ParticipationStatus, PaymentStatus } from '../entities/event-participation.entity';
import { CreateEventDto } from '../dto/create-event.dto';
import { UpdateEventDto } from '../dto/update-event.dto';
import { CreateParticipationDto } from '../dto/create-participation.dto';
import { ParticipationResponseDto } from '../dto/participation-response.dto';
import { EventWithCalendarDto } from '../dto/event-with-calendar.dto';
import { PaymentService } from '../../Payment/services/payment.service';
import { PaymentTransactionStatus } from '../../Payment/entities/payment.entity';
import { MailService } from '@common/services/mail.service';
import { UserService } from '../../User/user.service';
import { User } from '../../User/entities/user.entity';
import { NotificationService } from '@common/services/notification.service';

@Injectable()
export class EventService {
  constructor(
    @InjectRepository(Event)
    private eventRepository: Repository<Event>,
    @InjectRepository(EventParticipation)
    private participationRepository: Repository<EventParticipation>,
    private readonly paymentService: PaymentService,
    private readonly mailService: MailService,
    private readonly userService: UserService,
    private readonly notificationService: NotificationService
  ) {}

  // Méthode pour récupérer tous les événements
  async findAll(): Promise<Event[]> {
    return await this.eventRepository.find({
      relations: ['organizer', 'participations']
    });
  }

  // Méthode pour créer un événement
  async create(createEventDto: CreateEventDto, organizerId: string): Promise<Event> {
    console.log('[EventService] 🚀 Début de création d\'événement:', createEventDto.title);
    console.log('[EventService] 👤 Organisateur ID:', organizerId);
    
    // Vérifier si un événement existe déjà à cette date et ce lieu
    const existingEvent = await this.eventRepository.findOne({
      where: {
        date: createEventDto.date,
        location: createEventDto.location,
        is_cancelled: false
      }
    });

    if (existingEvent) {
      console.log('[EventService] ❌ Événement existant trouvé:', existingEvent.title);
      throw new ForbiddenException('Un événement existe déjà à cette date et ce lieu');
    }

    console.log('[EventService] ✅ Aucun événement existant trouvé, création en cours...');

    const event = this.eventRepository.create({
      ...createEventDto,
      organizer: { id: organizerId }
    });

    console.log('[EventService] 💾 Sauvegarde de l\'événement en base...');
    const savedEvent = await this.eventRepository.save(event);
    console.log('[EventService] ✅ Événement sauvegardé avec ID:', savedEvent.id);

    // TEMPORAIREMENT DÉSACTIVÉ : Envoi d'emails automatiques (cause de lenteur)
    // TODO: Implémenter un système de notifications en arrière-plan
    console.log('[EventService] ⚠️ Envoi d\'emails désactivé temporairement pour améliorer les performances');
    
    // Récupérer tous les membres (pour logs uniquement)
    // const members = await this.userService.findAll();
    // console.log('[EventService] 📧 Emails désactivés -', members.length, 'membres seraient notifiés');

    console.log('[EventService] 🎉 Création d\'événement terminée:', savedEvent.title);
    return savedEvent;
  }

  // Méthode pour trouver un événement par ID
  async findOne(id: string): Promise<Event> {
    return await this.eventRepository.findOne({
      where: { id },
      relations: ['organizer', 'participations']
    });
  }

  // Méthode pour mettre à jour un événement
  async update(id: string, updateEventDto: UpdateEventDto): Promise<Event> {
    // Récupérer l'événement actuel
    const currentEvent = await this.findOne(id);

    // Vérifier si quelque chose a changé
    let hasChanged = false;
    for (const key of Object.keys(updateEventDto)) {
      if (updateEventDto[key] !== undefined && updateEventDto[key] !== currentEvent[key]) {
        hasChanged = true;
        break;
      }
    }

    // Si rien n'a changé, retourner l'événement sans envoyer d'email
    if (!hasChanged) {
      return currentEvent;
    }

    // Sinon, mettre à jour et notifier les participants
    await this.eventRepository.update(id, updateEventDto);
    const event = await this.findOne(id);

    const participations = await this.participationRepository.find({
      where: { eventId: id },
      relations: ['participant']
    });

    for (const participation of participations) {
      if (participation.participant?.email) {
        await this.mailService.sendMail(
          participation.participant.email,
          'Événement modifié',
          `L'événement "${event.title}" auquel vous êtes inscrit a été modifié.`,
          `<p>L'événement <strong>${event.title}</strong> auquel vous êtes inscrit a été modifié.</p>`
        );
      }
    }

    return event;
  }

  // Méthode pour supprimer un événement
  async remove(id: string, userId: string, userRole: string): Promise<void> {
    // 1. Vérifier que l'événement existe
    const event = await this.eventRepository.findOne({
      where: { id },
      relations: ['organizer', 'participations']
    });

    if (!event) {
      throw new NotFoundException('Événement non trouvé');
    }

    // 2. Vérifier que l'utilisateur est l'organisateur ou un admin
    if (event.organizer.id !== userId && userRole !== 'ADMIN') {
      throw new ForbiddenException('Vous n\'êtes pas autorisé à supprimer cet événement');
    }

    // 3. Vérifier qu'il n'y a pas de participants inscrits
    if (event.participations && event.participations.length > 0) {
      throw new ForbiddenException('Impossible de supprimer un événement avec des participants inscrits');
    }

    // 4. Supprimer l'événement
    try {
      await this.eventRepository.delete(id);
    } catch (error) {
      throw error;
    }
  }

  // Méthode pour participer à un événement
  async participate(data: CreateParticipationDto): Promise<ParticipationResponseDto> {
    const event = await this.eventRepository.findOne({
      where: { id: data.eventId },
      relations: ['participations']
    });

    if (!event) {
      throw new NotFoundException('Événement non trouvé');
    }

    // Vérifier si l'utilisateur n'est pas déjà inscrit
    const existingParticipation = event.participations.find(
      p => p.participantId === data.participantId
    );

    if (existingParticipation) {
      throw new ConflictException('Déjà inscrit à cet événement');
    }

    // Vérifier si l'événement n'est pas complet
    if (event.participations.length >= event.max_participants) {
      throw new ConflictException('Événement complet');
    }

    // Créer la participation
    const participation = this.participationRepository.create({
      eventId: data.eventId,
      participantId: data.participantId,
      status: ParticipationStatus.PENDING,
      payment_status: event.price > 0 ? PaymentStatus.PENDING : PaymentStatus.FREE
    });

    const savedParticipation = await this.participationRepository.save(participation);

    return {
      message: 'Participation créée avec succès',
      participation: savedParticipation
    };
  }

  // Méthode pour les événements à venir
  async getUpcomingEvents(): Promise<Event[]> {
    try {
      const currentDate = new Date();
      const events = await this.eventRepository
        .createQueryBuilder('event')
        .leftJoinAndSelect('event.organizer', 'organizer')
        .where('event.date > :currentDate', { currentDate })
        .andWhere('event.is_cancelled = :isCancelled', { isCancelled: false })
        .orderBy('event.date', 'ASC')
        .getMany();

      return events;
    } catch (error) {
      throw error;
    }
  }

  // Méthode pour les événements auxquels un utilisateur est inscrit
  async getRegisteredEvents(userId: string): Promise<EventWithCalendarDto[]> {
    try {
      console.log('[EventService] getRegisteredEvents - userId:', userId);
      
      // Vérifier d'abord si l'utilisateur existe
      const user = await this.userService.findOne(userId);
      if (!user) {
        console.log('[EventService] Utilisateur non trouvé:', userId);
        return [];
      }
      
      const participations = await this.participationRepository
        .createQueryBuilder('participation')
        .leftJoinAndSelect('participation.event', 'event')
        .leftJoinAndSelect('event.organizer', 'organizer')
        .where('participation.participantId = :userId', { userId })
        .orderBy('event.date', 'ASC')
        .getMany();

      console.log('[EventService] Participations trouvées:', participations.length);
      
      // Log détaillé de chaque participation
      participations.forEach((participation, index) => {
        console.log(`[EventService] Participation ${index + 1}:`, {
          participationId: participation.id,
          eventId: participation.event?.id,
          eventTitle: participation.event?.title,
          participantId: participation.participantId,
          paymentStatus: participation.payment_status,
          status: participation.status,
          createdAt: participation.createdAt
        });
      });
      
      const eventsWithCalendar = participations.map(participation => {
        console.log('[EventService] Mapping participation:', {
          eventId: participation.event?.id,
          eventTitle: participation.event?.title,
          paymentStatus: participation.payment_status,
          status: participation.status
        });
        return new EventWithCalendarDto(participation.event, participation);
      });

      console.log('[EventService] Événements avec calendrier générés:', eventsWithCalendar.length);
      return eventsWithCalendar;
    } catch (error) {
      console.error('[EventService] Erreur dans getRegisteredEvents:', error);
      throw error;
    }
  }

  async approveParticipation(participationId: string): Promise<EventParticipation> {
    try {
      const participation = await this.participationRepository.findOne({
        where: { id: participationId }
      });

      if (!participation) {
        throw new NotFoundException('Participation non trouvée');
      }

      participation.status = ParticipationStatus.APPROVED;
      
      return await this.participationRepository.save(participation);
    } catch (error) {
      throw error;
    }
  }

  /**
   * Annule un événement et notifie tous les participants
   * @param id - ID de l'événement
   * @returns Résultat de l'annulation
   */
  async cancelEvent(id: string): Promise<{ success: boolean; message: string }> {
    try {
      console.log('[EventService] 🚨 DÉBUT ANNULATION ÉVÉNEMENT:', id);
      
      // 1. Récupérer l'événement avec ses participations
      const event = await this.eventRepository.findOne({
        where: { id },
        relations: ['participations', 'participations.participant']
      });
      
      if (!event) {
        throw new NotFoundException('Événement non trouvé');
      }

      // 2. Mettre à jour le champ is_cancelled
      event.is_cancelled = true;
      await this.eventRepository.save(event);
      console.log('[EventService] Événement marqué comme annulé:', event.title);

      // 3. Parcourir les participations pour notifier et rembourser si besoin
      let notificationCount = 0;
      let refundCount = 0;
      let pushNotificationCount = 0;
      
      for (const participation of event.participations) {
        if (participation.participant?.email) {
          try {
            let message = `Cher membre, l'événement "${event.title}" auquel vous étiez inscrit a été annulé.`;
            let htmlMessage = `<p>Cher membre, l'événement <strong>${event.title}</strong> auquel vous étiez inscrit a été annulé.</p>`;

            // Si remboursement nécessaire
            if (participation.payment_status === PaymentStatus.PAID) {
              try {
                console.log('[EventService] Tentative de remboursement pour:', participation.participant.email);
                await this.paymentService.refundParticipationPayment(event.id, participation.participantId);
                participation.payment_status = PaymentStatus.REFUNDED;
                await this.participationRepository.save(participation);
                refundCount++;

                message += ' Un remboursement va vous être effectué sous peu.';
                htmlMessage += '<p>Un remboursement va vous être effectué sous peu.</p>';
                console.log('[EventService] ✅ Remboursement effectué pour:', participation.participant.email);
                console.log('[EventService] 📧 Email avec info remboursement sera envoyé à:', participation.participant.email);
              } catch (err) {
                console.error('[EventService] Erreur lors du remboursement pour:', participation.participant.email, err);
                message += ' Une erreur est survenue lors du remboursement, veuillez contacter le support.';
                htmlMessage += '<p>Une erreur est survenue lors du remboursement, veuillez contacter le support.</p>';
              }
            }

            // 🚨 IMPORTANT: Envoi de l'email de notification (toujours activé pour annulations)
            console.log('[EventService] 📧 Envoi email annulation à:', participation.participant.email);
            
            // Envoyer l'email en arrière-plan (ne pas attendre)
            this.mailService.sendMail(
              participation.participant.email,
              `Annulation de l'événement "${event.title}"`,
              message,
              htmlMessage
            ).then(() => {
              console.log('[EventService] ✅ Email d\'annulation envoyé avec succès à:', participation.participant.email);
            }).catch((error) => {
              console.error('[EventService] ❌ Erreur envoi email à:', participation.participant.email, error);
            });
            
            notificationCount++;

            // Envoi de notification push
            try {
              await this.notificationService.sendPushNotificationToUser(
                participation.participantId,
                'Événement annulé',
                `L'événement "${event.title}" a été annulé.`,
                {
                  eventId: event.id,
                  eventTitle: event.title,
                  type: 'event_cancelled'
                }
              );
              pushNotificationCount++;
              console.log('[EventService] Notification push envoyée à:', participation.participant.email);
            } catch (pushErr) {
              console.error('[EventService] Erreur lors de l\'envoi de la notification push à:', participation.participant.email, pushErr);
            }
          } catch (err) {
            console.error('[EventService] Erreur lors de l\'envoi de l\'email à:', participation.participant.email, err);
          }
        } else {
          console.warn('[EventService] Participant sans email:', participation.participantId);
        }
      }

      // 4. Mettre à jour les paiements liés à l'événement (sécurité)
      try {
        await this.paymentService.refundAllPaymentsForEvent(event.id);
        console.log('[EventService] Remboursements de sécurité effectués');
      } catch (err) {
        console.error('[EventService] Erreur lors des remboursements de sécurité:', err);
      }

      console.log('[EventService] Annulation terminée:', {
        eventTitle: event.title,
        notificationsEnvoyees: notificationCount,
        notificationsPushEnvoyees: pushNotificationCount,
        remboursementsEffectues: refundCount,
        totalParticipants: event.participations.length
      });

      return { 
        success: true, 
        message: `Événement annulé. ${notificationCount} emails envoyés, ${pushNotificationCount} notifications push envoyées, ${refundCount} remboursements effectués.` 
      };
    } catch (error) {
      console.error('[EventService] Erreur lors de l\'annulation de l\'événement:', error);
      throw error;
    }
  }

  /**
   * Récupère la participation d'un utilisateur à un événement
   * @param eventId - ID de l'événement
   * @param userId - ID de l'utilisateur
   * @returns La participation ou null si elle n'existe pas
   */
  async getParticipation(eventId: string, userId: string): Promise<any> {
    try {
      const participation = await this.participationRepository.findOne({
        where: { eventId, participantId: userId },
        relations: ['event', 'participant']
      });
      
      return participation;
    } catch (error) {
      console.error('[EventService] Erreur lors de la récupération de la participation:', error);
      throw error;
    }
  }

  /**
   * Annule la participation d'un utilisateur à un événement
   * @param eventId - ID de l'événement
   * @param userId - ID de l'utilisateur
   * @returns Résultat de l'annulation
   */
  async unregister(eventId: string, userId: string): Promise<{ success: boolean; message: string }> {
    try {
      console.log('[EventService] Annulation de participation - eventId:', eventId, 'userId:', userId);
      
      // Récupérer la participation
      const participation = await this.participationRepository.findOne({
        where: { eventId, participantId: userId },
        relations: ['event', 'participant']
      });

      if (!participation) {
        throw new NotFoundException('Participation non trouvée');
      }

      // Si l'utilisateur a payé, effectuer un remboursement
      if (participation.payment_status === PaymentStatus.PAID) {
        try {
          console.log('[EventService] Tentative de remboursement pour:', participation.participant?.email);
          await this.paymentService.refundParticipationPayment(eventId, userId);
          console.log('[EventService] Remboursement effectué pour:', participation.participant?.email);
        } catch (err) {
          console.error('[EventService] Erreur lors du remboursement:', err);
          // On continue même si le remboursement échoue
        }
      }

      // Supprimer la participation
      await this.participationRepository.remove(participation);
      
      console.log('[EventService] Participation supprimée avec succès');
      
      return {
        success: true,
        message: 'Participation annulée avec succès'
      };
    } catch (error) {
      console.error('[EventService] Erreur lors de l\'annulation de la participation:', error);
      throw error;
    }
  }

  /**
   * Confirme la présence d'un participant à un événement
   * Vérifie que le paiement est effectué avant de permettre la confirmation
   * Envoie un email à l'admin pour notifier la confirmation
   */
  async confirmPresence(eventId: string, userId: string): Promise<{ success: boolean; message: string }> {
    try {
      // 1. Vérifier que l'événement existe
      const event = await this.eventRepository.findOne({
        where: { id: eventId },
        relations: ['organizer'] // On n'a plus besoin de participations ici
      });

      if (!event) {
        throw new NotFoundException('Événement non trouvé');
      }

      // 2. Recherche directe de la participation en base (plus fiable que le mapping)
      const participation = await this.participationRepository.findOne({
        where: { eventId, participantId: userId },
        relations: ['participant']
      });
      if (!participation) {
        throw new ForbiddenException('Vous n\'êtes pas inscrit à cet événement');
      }

      // 3. Vérifier que le paiement est effectué
      if (participation.payment_status !== PaymentStatus.PAID && event.price > 0) {
        throw new ForbiddenException('Le paiement doit être effectué avant de confirmer votre présence');
      }

      // 4. Vérifier que la présence n'est pas déjà confirmée
      if (participation.status === ParticipationStatus.CONFIRMED) {
        throw new ConflictException('Votre présence est déjà confirmée');
      }

      // 5. Confirmer la présence
      participation.status = ParticipationStatus.CONFIRMED;
      await this.participationRepository.save(participation);

      // 6. Envoyer un email à l'admin
      const participant = participation.participant;
      if (participant?.email) {
        await this.mailService.sendPresenceConfirmationEmail({
          participantName: participant.email.split('@')[0],
          participantEmail: participant.email,
          eventTitle: event.title,
          eventDate: event.date,
          eventLocation: event.location,
          adminEmail: event.organizer?.email || 'admin@clubnetwork.com'
        });
      }

      return {
        success: true,
        message: 'Présence confirmée avec succès. Un email a été envoyé à l\'administrateur.'
      };

    } catch (error) {
      if (error instanceof NotFoundException || 
          error instanceof ForbiddenException || 
          error instanceof ConflictException) {
        throw error;
      }
      
      throw new Error('Erreur lors de la confirmation de présence');
    }
  }

  /**
   * Ajoute un événement à l'agenda de l'utilisateur
   * @param eventId - ID de l'événement
   * @param userId - ID de l'utilisateur
   * @returns Participation mise à jour
   */
  async addToAgenda(eventId: string, userId: string): Promise<EventParticipation> {
    try {
      console.log('[EventService] Ajout à l\'agenda - eventId:', eventId, 'userId:', userId);

      // Vérifier si l'utilisateur est déjà inscrit à l'événement
      const existingParticipation = await this.participationRepository.findOne({
        where: { eventId, participantId: userId }
      });

      if (!existingParticipation) {
        throw new NotFoundException('Vous n\'êtes pas inscrit à cet événement');
      }

      // Vérifier si déjà ajouté à l'agenda
      if (existingParticipation.status === ParticipationStatus.ADDED_TO_AGENDA) {
        throw new ConflictException('Cet événement est déjà dans votre agenda');
      }

      // Mettre à jour le statut et la date d'ajout
      existingParticipation.status = ParticipationStatus.ADDED_TO_AGENDA;
      existingParticipation.added_to_agenda_at = new Date();

      const updatedParticipation = await this.participationRepository.save(existingParticipation);
      
      console.log('[EventService] Événement ajouté à l\'agenda avec succès');
      return updatedParticipation;
    } catch (error) {
      console.error('[EventService] Erreur lors de l\'ajout à l\'agenda:', error);
      
      if (error instanceof NotFoundException || 
          error instanceof ConflictException) {
        throw error;
      }
      
      throw new Error('Erreur lors de l\'ajout à l\'agenda');
    }
  }

  /**
   * Retire un événement de l'agenda de l'utilisateur
   * @param eventId - ID de l'événement
   * @param userId - ID de l'utilisateur
   * @returns Participation mise à jour
   */
  async removeFromAgenda(eventId: string, userId: string): Promise<EventParticipation> {
    try {
      console.log('[EventService] Retrait de l\'agenda - eventId:', eventId, 'userId:', userId);

      const participation = await this.participationRepository.findOne({
        where: { eventId, participantId: userId }
      });

      if (!participation) {
        throw new NotFoundException('Participation non trouvée');
      }

      if (participation.status !== ParticipationStatus.ADDED_TO_AGENDA) {
        throw new ConflictException('Cet événement n\'est pas dans votre agenda');
      }

      // Remettre le statut à CONFIRMED
      participation.status = ParticipationStatus.CONFIRMED;
      participation.added_to_agenda_at = null;

      const updatedParticipation = await this.participationRepository.save(participation);
      
      console.log('[EventService] Événement retiré de l\'agenda avec succès');
      return updatedParticipation;
    } catch (error) {
      console.error('[EventService] Erreur lors du retrait de l\'agenda:', error);
      
      if (error instanceof NotFoundException || 
          error instanceof ConflictException) {
        throw error;
      }
      
      throw new Error('Erreur lors du retrait de l\'agenda');
    }
  }

  /**
   * Traite un paiement avec protection contre les doublons
   * @param eventId - ID de l'événement
   * @param userId - ID de l'utilisateur
   * @param paymentIntentId - ID du paiement Stripe
   * @returns Participation mise à jour
   */
  async processPayment(eventId: string, userId: string, paymentIntentId: string): Promise<EventParticipation> {
    try {
      console.log('[EventService] Traitement du paiement - eventId:', eventId, 'userId:', userId);

      const participation = await this.participationRepository.findOne({
        where: { eventId, participantId: userId }
      });

      if (!participation) {
        throw new NotFoundException('Participation non trouvée');
      }

      // Vérifier si déjà payé
      if (participation.payment_status === PaymentStatus.PAID) {
        throw new ConflictException('Cet événement a déjà été payé');
      }

      // Vérifier les tentatives de paiement récentes (protection contre le spam)
      const now = new Date();
      const lastAttempt = participation.last_payment_attempt_at;
      const timeSinceLastAttempt = lastAttempt ? now.getTime() - lastAttempt.getTime() : Infinity;
      const minTimeBetweenAttempts = 30000; // 30 secondes

      if (timeSinceLastAttempt < minTimeBetweenAttempts) {
        throw new ConflictException('Trop de tentatives de paiement. Veuillez attendre avant de réessayer.');
      }

      // Mettre à jour les informations de paiement
      participation.payment_intent_id = paymentIntentId;
      participation.payment_status = PaymentStatus.PAID;
      participation.last_payment_attempt_at = now;
      participation.payment_attempts_count += 1;

      const updatedParticipation = await this.participationRepository.save(participation);
      
      console.log('[EventService] Paiement traité avec succès');
      return updatedParticipation;
    } catch (error) {
      console.error('[EventService] Erreur lors du traitement du paiement:', error);
      
      if (error instanceof NotFoundException || 
          error instanceof ConflictException) {
        throw error;
      }
      
      throw new Error('Erreur lors du traitement du paiement');
    }
  }

  /**
   * Vérifie si un événement est dans l'agenda de l'utilisateur
   * @param eventId - ID de l'événement
   * @param userId - ID de l'utilisateur
   * @returns Boolean indiquant si l'événement est dans l'agenda
   */
  async isInAgenda(eventId: string, userId: string): Promise<boolean> {
    try {
      const participation = await this.participationRepository.findOne({
        where: { 
          eventId, 
          participantId: userId,
          status: ParticipationStatus.ADDED_TO_AGENDA
        }
      });

      return !!participation;
    } catch (error) {
      console.error('[EventService] Erreur lors de la vérification de l\'agenda:', error);
      return false;
    }
  }
} 