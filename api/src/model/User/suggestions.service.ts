import { Injectable } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository, In } from 'typeorm';
import { User } from './entities/user.entity';
import { Contact, ContactStatus } from '../Contact/entities/contact.entity';

@Injectable()
export class SuggestionsService {
  constructor(
    @InjectRepository(User)
    private readonly userRepository: Repository<User>,
    @InjectRepository(Contact)
    private readonly contactRepository: Repository<Contact>
  ) {}

  /**
   * Génère des suggestions de contacts basées sur plusieurs critères
   */
  async getContactSuggestions(userId: string, limit: number = 10): Promise<User[]> {
    const user = await this.userRepository.findOne({ where: { id: userId } });
    if (!user) return [];

    const suggestions = new Map<string, { user: User; score: number }>();

    // 1. Suggestions basées sur les contacts existants (amis d'amis)
    const friendsOfFriends = await this.getFriendsOfFriends(userId);
    friendsOfFriends.forEach(friend => {
      suggestions.set(friend.id, { user: friend, score: 80 });
    });

    // 2. Suggestions basées sur le secteur d'activité
    if (user.secteur) {
      const sameSectorUsers = await this.getUsersBySector(user.secteur, userId);
      sameSectorUsers.forEach(sectorUser => {
        const existing = suggestions.get(sectorUser.id);
        if (existing) {
          existing.score += 60;
        } else {
          suggestions.set(sectorUser.id, { user: sectorUser, score: 60 });
        }
      });
    }

    // 3. Suggestions basées sur l'entreprise
    if (user.entreprise) {
      const sameCompanyUsers = await this.getUsersByCompany(user.entreprise, userId);
      sameCompanyUsers.forEach(companyUser => {
        const existing = suggestions.get(companyUser.id);
        if (existing) {
          existing.score += 70;
        } else {
          suggestions.set(companyUser.id, { user: companyUser, score: 70 });
        }
      });
    }

    // 4. Suggestions basées sur la localisation (si disponible)
    // TODO: Ajouter quand on aura un champ localisation

    // 5. Suggestions aléatoires pour les nouveaux utilisateurs
    if (suggestions.size < limit) {
      const randomUsers = await this.getRandomUsers(userId, limit - suggestions.size);
      randomUsers.forEach(randomUser => {
        if (!suggestions.has(randomUser.id)) {
          suggestions.set(randomUser.id, { user: randomUser, score: 30 });
        }
      });
    }

    // Trier par score et retourner les meilleures suggestions
    return Array.from(suggestions.values())
      .sort((a, b) => b.score - a.score)
      .slice(0, limit)
      .map(item => item.user);
  }

  /**
   * Récupère les amis d'amis (contacts des contacts)
   */
  private async getFriendsOfFriends(userId: string): Promise<User[]> {
    // Récupérer les contacts acceptés de l'utilisateur
    const userContacts = await this.contactRepository.find({
      where: {
        owner: { id: userId },
        status: ContactStatus.ACCEPTED
      },
      relations: ['contact']
    });

    const contactIds = userContacts.map(c => c.contact.id);
    if (contactIds.length === 0) return [];

    // Récupérer les contacts des contacts
    const friendsOfFriends = await this.contactRepository.find({
      where: [
        { owner: { id: In(contactIds) }, status: ContactStatus.ACCEPTED },
        { contact: { id: In(contactIds) }, status: ContactStatus.ACCEPTED }
      ],
      relations: ['owner', 'contact']
    });

    // Extraire les utilisateurs uniques
    const suggestedUsers = new Set<string>();
    friendsOfFriends.forEach(relation => {
      const friendId = relation.owner.id === contactIds[0] ? relation.contact.id : relation.owner.id;
      if (friendId !== userId && !contactIds.includes(friendId)) {
        suggestedUsers.add(friendId);
      }
    });

    if (suggestedUsers.size === 0) return [];

    return this.userRepository.find({
      where: { id: In(Array.from(suggestedUsers)), isActive: true }
    });
  }

  /**
   * Récupère les utilisateurs du même secteur
   */
  private async getUsersBySector(secteur: string, excludeUserId: string): Promise<User[]> {
    return this.userRepository.find({
      where: {
        secteur,
        isActive: true,
        id: excludeUserId
      },
      take: 20
    });
  }

  /**
   * Récupère les utilisateurs de la même entreprise
   */
  private async getUsersByCompany(entreprise: string, excludeUserId: string): Promise<User[]> {
    return this.userRepository.find({
      where: {
        entreprise,
        isActive: true,
        id: excludeUserId
      },
      take: 20
    });
  }

  /**
   * Récupère des utilisateurs aléatoires
   */
  private async getRandomUsers(excludeUserId: string, limit: number): Promise<User[]> {
    return this.userRepository
      .createQueryBuilder('user')
      .where('user.isActive = :isActive', { isActive: true })
      .andWhere('user.id != :excludeUserId', { excludeUserId })
      .orderBy('RANDOM()')
      .limit(limit)
      .getMany();
  }
} 