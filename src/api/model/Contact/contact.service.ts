import { Injectable, ConflictException, NotFoundException, ForbiddenException } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { Contact, ContactStatus } from './entities/contact.entity';
import { User } from '../User/entities/user.entity';
import { NotificationService } from '../../common/services/notification.service';

@Injectable()
export class ContactService {
  constructor(
    @InjectRepository(Contact)
    private readonly contactRepository: Repository<Contact>,
    @InjectRepository(User)
    private readonly userRepository: Repository<User>,
    private readonly notificationService: NotificationService
  ) {}

  /**
   * Envoi d'une demande de contact (statut PENDING).
   * Vérifie que les deux utilisateurs existent et qu'il n'y a pas déjà une relation ou une demande.
   * Crée la demande façon LinkedIn (owner = expéditeur, contact = destinataire).
   */
  async sendContactRequest(ownerId: string, contactId: string): Promise<Contact> {
    if (ownerId === contactId) {
      throw new ConflictException('Vous ne pouvez pas vous ajouter vous-même');
    }
    const owner = await this.userRepository.findOne({ where: { id: ownerId } });
    const contact = await this.userRepository.findOne({ where: { id: contactId } });
    if (!owner || !contact) {
      throw new NotFoundException('Utilisateur non trouvé');
    }
    // Vérifie qu'il n'existe pas déjà une demande ou un contact accepté
    const existing = await this.contactRepository.findOne({
      where: [
        { owner: { id: ownerId }, contact: { id: contactId } },
        { owner: { id: contactId }, contact: { id: ownerId } }
      ]
    });
    if (existing) {
      throw new ConflictException('Une demande ou un contact existe déjà');
    }
    // Correction : owner = expéditeur, contact = destinataire
    // Ainsi, le destinataire (contactId) verra la demande dans /contacts/pending
    const newRequest = this.contactRepository.create({ owner, contact, status: ContactStatus.PENDING });
    const savedRequest = await this.contactRepository.save(newRequest);
    
    // Envoyer une notification au destinataire
    try {
      await this.notificationService.sendContactRequestNotification(
        contactId,
        `${owner.prenom} ${owner.nom}`,
        ownerId
      );
    } catch (error) {
      console.error('Erreur lors de l\'envoi de la notification:', error);
    }
    
    return savedRequest;
  }

  /**
   * Acceptation d'une demande de contact (statut ACCEPTED).
   * Passe la demande à ACCEPTED et crée la relation réciproque si elle n'existe pas.
   */
  async acceptContactRequest(userId: string, requestId: string) {
    // On vérifie que la demande existe, est en attente, et que l'utilisateur connecté est bien le destinataire
    const request = await this.contactRepository.findOne({
      where: { id: requestId, contact: { id: userId }, status: ContactStatus.PENDING },
      relations: ['owner', 'contact']
    });
    if (!request) throw new NotFoundException('Demande non trouvée ou déjà traitée');
    request.status = ContactStatus.ACCEPTED;
    await this.contactRepository.save(request);

    // Crée la relation réciproque si elle n'existe pas déjà
    const inverse = await this.contactRepository.findOne({
      where: { owner: { id: userId }, contact: { id: request.owner.id } }
    });
    if (!inverse) {
      const reciprocal = this.contactRepository.create({
        owner: request.contact,
        contact: request.owner,
        status: ContactStatus.ACCEPTED
      });
      await this.contactRepository.save(reciprocal);
    }
    return request;
  }

  /**
   * Refus d'une demande de contact (statut REFUSED).
   * Passe la demande à REFUSED, la relation n'est pas créée.
   */
  async refuseContactRequest(userId: string, requestId: string) {
    const request = await this.contactRepository.findOne({
      where: { id: requestId, contact: { id: userId }, status: ContactStatus.PENDING },
      relations: ['owner', 'contact']
    });
    if (!request) throw new NotFoundException('Demande non trouvée ou déjà traitée');
    request.status = ContactStatus.REFUSED;
    return this.contactRepository.save(request);
  }

  /**
   * Récupère la liste des contacts acceptés pour affichage.
   * Seuls les contacts avec le statut ACCEPTED sont retournés.
   */
  async getContacts(ownerId: string): Promise<Contact[]> {
    // On ne retourne que les contacts ACCEPTED
    return this.contactRepository.find({
      where: {
        owner: { id: ownerId },
        status: ContactStatus.ACCEPTED
      },
      relations: ['contact']
    });
  }

  /**
   * Récupère les demandes de contact en attente reçues par l'utilisateur.
   * Permet d'afficher les invitations à accepter ou refuser.
   */
  async getPendingRequests(userId: string) {
    return this.contactRepository.find({
      where: {
        contact: { id: userId },
        status: ContactStatus.PENDING
      },
      relations: ['owner', 'contact']
    });
  }

  /**
   * Suppression d'un contact (et de la relation réciproque si elle existe).
   * Seul le propriétaire ou le destinataire peut supprimer la relation.
   */
  async deleteContact(userId: string, relationId: string): Promise<{ success: boolean; message: string }> {
    await this.contactRepository.manager.transaction(async (manager) => {
      const repo = manager.getRepository(Contact);

      // On cherche la relation par son id
      const relation = await repo.findOne({
        where: { id: relationId },
        relations: ['owner', 'contact']
      });

      if (!relation) {
        throw new NotFoundException('Relation de contact non trouvée');
      }
      // Vérifie que l'utilisateur connecté est bien concerné
      if (relation.owner.id !== userId && relation.contact.id !== userId) {
        throw new ForbiddenException('Non autorisé à supprimer cette relation');
      }

      // Supprime la relation principale
      await repo.remove(relation);

      // Supprime la relation réciproque si elle existe
      const inverse = await repo.findOne({
        where: {
          owner: { id: relation.contact.id },
          contact: { id: relation.owner.id }
        }
      });
      if (inverse) await repo.remove(inverse);
    });

    return { success: true, message: 'Contact supprimé avec succès' };
  }
} 