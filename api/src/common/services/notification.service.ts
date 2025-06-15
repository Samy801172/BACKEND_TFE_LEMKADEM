import { Injectable } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { Notification, NotificationType } from '../../model/Notification/entities';
import { User } from '../../model/User/entities';

@Injectable()
export class NotificationService {
  constructor(
    @InjectRepository(Notification)
    private notificationRepo: Repository<Notification>,
  ) {}
  /**
   * Crée et enregistre une notification pour un utilisateur
   * @param recipient L'utilisateur destinataire
   * @param type Le type de notification (enum)
   * @param title Le titre de la notification
   * @param content Le contenu/message de la notification
   * @param metadata Métadonnées optionnelles (ex : id de paiement, d'événement…)
   */
  async createNotification(
    recipient: User,
    type: NotificationType,
    title: string,
    content: string,
    metadata?: Record<string, any>
  ) {
    const notification = this.notificationRepo.create({
      recipient,
      type,
      title,
      content,
      metadata,
    });
    return this.notificationRepo.save(notification);
  }

  /**
   * Marque une notification comme lue (is_read = true)
   * @param id L'identifiant de la notification
   */
  async markAsRead(id: string): Promise<Notification> {
    // Recherche la notification par son id
    const notification = await this.notificationRepo.findOne({ where: { id } });
    if (!notification) {
      throw new Error('Notification not found');
    }
    // Met à jour le champ is_read
    notification.is_read = true;
    // Sauvegarde la notification modifiée
    return this.notificationRepo.save(notification);
  }
}
