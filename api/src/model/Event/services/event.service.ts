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
import { MailService } from 'src/common/services/mail.service';
import { UserService } from '../../User/user.service';
import { User } from '../../User/entities/user.entity';

@Injectable()
export class EventService {
  constructor(
    @InjectRepository(Event)
    private eventRepository: Repository<Event>,
    @InjectRepository(EventParticipation)
    private participationRepository: Repository<EventParticipation>,
    private readonly paymentService: PaymentService,
    private readonly mailService: MailService,
    private readonly userService: UserService
  ) {}

  // Méthode pour récupérer tous les événements
  async findAll(): Promise<Event[]> {
    return await this.eventRepository.find({
      relations: ['organizer', 'participations']
    });
  }

  // Méthode pour créer un événement
  async create(createEventDto: CreateEventDto, organizerId: string): Promise<Event> {
    // Vérifier si un événement existe déjà à cette date et ce lieu
    const existingEvent = await this.eventRepository.findOne({
      where: {
        date: createEventDto.date,
        location: createEventDto.location,
        is_cancelled: false
      }
    });

    if (existingEvent) {
      throw new ForbiddenException('Un événement existe déjà à cette date et ce lieu');
    }

    const event = this.eventRepository.create({
      ...createEventDto,
      organizer: { id: organizerId }
    });

    // Récupérer tous les membres
    const members = await this.userService.findAll();

    // Envoyer un email à chaque membre
    for (const member of members) {
      try {
        await this.mailService.sendMail(
          member.email, // Utiliser l'email du membre
          'Nouvel événement créé',
          `Un nouvel événement a été créé : ${createEventDto.title}`,
          `<p>Un nouvel événement a été créé : <strong>${createEventDto.title}</strong></p>`
        );
      } catch (error) {
        // DEBUG: Erreur lors de l'envoi de l'email à un membre (à activer uniquement en développement)
        // console.error(`Erreur lors de l'envoi de l'email à ${member.email}:`, error);
      }
    }

    return await this.eventRepository.save(event);
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
      const participations = await this.participationRepository
        .createQueryBuilder('participation')
        .leftJoinAndSelect('participation.event', 'event')
        .leftJoinAndSelect('event.organizer', 'organizer')
        .where('participation.participantId = :userId', { userId })
        .orderBy('event.date', 'ASC')
        .getMany();

      const eventsWithCalendar = participations.map(participation => {
        return new EventWithCalendarDto(participation.event, participation);
      });

      return eventsWithCalendar;
    } catch (error) {
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
   * Annule un événement (soft delete), notifie et rembourse les participants si besoin
   */
  async cancelEvent(id: string): Promise<{ success: boolean; message: string }> {
    // 1. Chercher l'événement avec ses participations et les infos participants
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

    // 3. Parcourir les participations pour notifier et rembourser si besoin
    for (const participation of event.participations) {
      if (participation.participant?.email) {
        let message = `Cher membre, l'événement "${event.title}" auquel vous étiez inscrit a été annulé.`;
        let htmlMessage = `<p>Cher membre, l'événement <strong>${event.title}</strong> auquel vous étiez inscrit a été annulé.</p>`;

        // Si remboursement
        if (participation.payment_status === PaymentStatus.PAID) {
          try {
            await this.paymentService.refundParticipationPayment(event.id, participation.participantId);
            participation.payment_status = PaymentStatus.REFUNDED;
            await this.participationRepository.save(participation);

            message += ' Un remboursement va vous être effectué sous peu.';
            htmlMessage += '<p>Un remboursement va vous être effectué sous peu.</p>';
          } catch (err) {
            message += ' Une erreur est survenue lors du remboursement, veuillez contacter le support.';
            htmlMessage += '<p>Une erreur est survenue lors du remboursement, veuillez contacter le support.</p>';
          }
        }

        // Envoi de l'email
        try {
          await this.mailService.sendMail(
            participation.participant.email,
            `Annulation de l'événement "${event.title}"`,
            message,
            htmlMessage
          );
        } catch (err) {
        }
      } else {
      }
    }

    // 4. Mettre à jour les paiements liés à l'événement (sécurité)
    await this.paymentService.refundAllPaymentsForEvent(event.id);

    return { success: true, message: 'Événement annulé, notifications et remboursements Stripe effectués' };
  }
} 