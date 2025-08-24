import { Injectable, NotFoundException } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { User } from './entities/user.entity';
import { CreateUserDto } from './dto/create-user.dto';
import { UpdateUserDto } from './dto/update-user.dto';
import { UserRole } from './entities/user-role.enum';
import { MailService } from '../../common/services/mail.service';
import { Credential } from '../../feature/security/data/entity/credential.entity';
import { encryptPassword } from '../../feature/security/utils/password.utils';

@Injectable()
export class UserService {
  constructor(
    @InjectRepository(User)
    private readonly userRepository: Repository<User>,
    @InjectRepository(Credential)
    private readonly credentialRepository: Repository<Credential>,
    private readonly mailService: MailService
  ) {}

  async create(createUserDto: CreateUserDto): Promise<User> {
    // Hacher le mot de passe avant de sauvegarder
    if (createUserDto.password) {
      createUserDto.password = await encryptPassword(createUserDto.password);
    }
    
    const user = this.userRepository.create(createUserDto);
    return await this.userRepository.save(user);
  }

  /**
   * Retourne tous les membres actifs (isActive: true).
   * Le frontend pourra ainsi afficher uniquement les membres actifs pour la messagerie.
   */
  async findAll(): Promise<User[]> {
    return await this.userRepository.find({
      where: { isActive: true },
      order: { created_at: 'DESC' }
    });
  }

  /**
   * Recherche des utilisateurs par nom, prénom ou email
   * Exclut l'utilisateur connecté de la recherche
   */
  async searchUsers(query: string, excludeUserId: string): Promise<User[]> {
    try {
      const searchQuery = this.userRepository
        .createQueryBuilder('user')
        .where('user.isActive = :isActive', { isActive: true })
        .andWhere('user.id != :excludeUserId', { excludeUserId })
        .andWhere(
          '(LOWER(user.nom) LIKE LOWER(:query) OR LOWER(user.prenom) LIKE LOWER(:query) OR LOWER(user.email) LIKE LOWER(:query))',
          { query: `%${query}%` }
        )
        .orderBy('user.nom', 'ASC')
        .addOrderBy('user.prenom', 'ASC');

      return await searchQuery.getMany();
    } catch (error) {
      console.error('Erreur lors de la recherche d\'utilisateurs:', error);
      throw error;
    }
  }

  async findOne(id: string): Promise<any> {
    const user = await this.userRepository.findOne({ 
      where: { id, isActive: true } 
    });
    if (!user) {
      throw new NotFoundException(`User with ID ${id} not found`);
    }
    return {
      id: user.id,
      nom: user.nom,
      prenom: user.prenom,
      email: user.email,
      entreprise: user.entreprise,
      type_user: user.type_user,
      telephone: user.telephone,
      secteur: user.secteur,
      bio: user.bio,
      photo: user.photo,
      linkedin: user.linkedin,
      isActive: user.isActive,
      created_at: user.created_at,
      updated_at: user.updated_at
    };
  }

  async findByEmail(email: string): Promise<User | undefined> {
    return await this.userRepository.findOne({ 
      where: { email } 
    });
  }

  async put(id: string, updateUserDto: UpdateUserDto): Promise<User> {
    const user = await this.userRepository.findOne({ where: { id } });
    if (!user) throw new NotFoundException('User not found');
    
    // PROTECTION : Empêcher la modification du rôle via l'API de mise à jour
    const { type_user, ...safeUpdateData } = updateUserDto;
    
    // Log pour debug si quelqu'un essaie de modifier le rôle
    if (type_user !== undefined) {
      console.warn(`⚠️ Tentative de modification du rôle utilisateur ${user.email} de ${user.type_user} vers ${type_user} - BLOCQUÉE`);
    }
    
    // Hacher le mot de passe si il est fourni
    if (safeUpdateData.password) {
      safeUpdateData.password = await encryptPassword(safeUpdateData.password);
    }
    
    Object.assign(user, safeUpdateData);
    await this.userRepository.save(user);

    // After saving the updated user, send a confirmation email
    await this.mailService.sendMail(
      user.email,
      'Mise à jour du profil',
      'Votre profil a été mis à jour avec succès.'
    );
    // DEBUG: Mail de confirmation de mise à jour envoyé à l'utilisateur (à activer uniquement en développement)
    // console.log('[UserService] Mail de confirmation de mise à jour envoyé à:', user.email);

    return user;
  }

  async remove(id: string): Promise<void> {
    const user = await this.userRepository.findOne({ where: { id } });
    // DEBUG: Recherche du user à désactiver (à activer uniquement en développement)
    // console.log('[UserService] Recherche du user à désactiver:', user);

    if (!user) {
      // DEBUG: User non trouvé (à activer uniquement en développement)
      // console.log('[UserService] User non trouvé');
      throw new NotFoundException(`User with ID ${id} not found`);
    }

    if (!user.isActive) {
      // DEBUG: User déjà désactivé (à activer uniquement en développement)
      // console.log('[UserService] User déjà désactivé');
      throw new Error('Utilisateur déjà désactivé');
    }

    // Soft delete : on marque l'utilisateur comme inactif
    user.isActive = false;
    await this.userRepository.save(user);
    // DEBUG: User désactivé, envoi du mail (à activer uniquement en développement)
    // console.log('[UserService] User désactivé, envoi du mail à:', user.email);

    // Envoi d'un email de notification de désactivation
    await this.mailService.sendMail(
      user.email,
      'Compte désactivé',
      'Votre compte a été désactivé par un administrateur. Contactez-nous si besoin.'
    );
    // DEBUG: Mail de désactivation envoyé (à activer uniquement en développement)
    // console.log('[UserService] Mail de désactivation envoyé à:', user.email);

    // Désactiver aussi le credential associé (active = false)
    const credential = await this.credentialRepository.findOne({ where: { mail: user.email } });
    if (credential) {
      credential.active = false;
      await this.credentialRepository.save(credential);
      // DEBUG: Credential désactivé pour l'utilisateur (à activer uniquement en développement)
      // console.log('[UserService] Credential désactivé pour:', user.email);
    }
  }

  async findByUsername(username: string): Promise<User> {
    const user = await this.userRepository.findOne({
      where: { email: username },
      select: ['id', 'email', 'password', 'type_user']
    });
    // DEBUG: User trouvé dans DB (à activer uniquement en développement)
    // console.log('User trouvé dans DB:', user);
    return user;
  }

  async restore(id: string): Promise<void> {
    // DEBUG: Tentative de restauration pour l'utilisateur (à activer uniquement en développement)
    // console.log('[UserService] Tentative de restauration pour ID:', id);
    const user = await this.userRepository.findOne({ where: { id } });

    if (!user) {
      // DEBUG: Utilisateur non trouvé lors de la restauration (à activer uniquement en développement)
      // console.error('[UserService] Utilisateur non trouvé');
      throw new NotFoundException(`User with ID ${id} not found`);
    }

    if (user.isActive) {
      // DEBUG: Utilisateur déjà actif lors de la restauration (à activer uniquement en développement)
      // console.error('[UserService] Utilisateur déjà actif');
      throw new Error('Utilisateur déjà actif');
    }

    // Réactiver l'utilisateur
    user.isActive = true;
    await this.userRepository.save(user);
    // DEBUG: Utilisateur réactivé (à activer uniquement en développement)
    // console.log('[UserService] Utilisateur réactivé:', user.email);

    // Réactiver aussi le credential associé
    const credential = await this.credentialRepository.findOne({ where: { mail: user.email } });
    if (credential) {
      credential.active = true;
      await this.credentialRepository.save(credential);
      // DEBUG: Credential réactivé pour l'utilisateur (à activer uniquement en développement)
      // console.log('[UserService] Credential réactivé pour:', user.email);
    }

    try {
      // Envoi d'un email de notification de restauration
      await this.mailService.sendMail(
        user.email,
        'Compte restauré',
        'Votre compte a été restauré par un administrateur. Vous pouvez maintenant vous reconnecter.'
      );
      // DEBUG: Mail de restauration envoyé (à activer uniquement en développement)
      // console.log('[UserService] Mail de restauration envoyé à:', user.email);
    } catch (error) {
      // DEBUG: Erreur lors de l'envoi de l'email de restauration (à activer uniquement en développement)
      // console.error('Erreur lors de l\'envoi de l\'email de restauration:', error);
    }
  }

  /**
   * Récupère tous les contacts potentiels pour un utilisateur
   * - Exclut l'utilisateur lui-même
   * - Ne retourne que les utilisateurs actifs
   * - Limite les champs retournés aux informations essentielles
   *
   * @param userId ID de l'utilisateur courant
   * @returns Liste des contacts potentiels
   */
  async findContacts(userId: string) {
    // Importer Not depuis typeorm si ce n'est pas déjà fait
    const { Not } = require('typeorm');
    
    return this.userRepository.find({
      where: { 
        isActive: true, 
        id: Not(userId) 
      },
      select: ['id', 'nom', 'prenom', 'email']
    });
  }

  /**
   * Envoie une demande de contact (invitation) à un autre membre.
   * @param userId ID de l'utilisateur courant
   * @param contactId ID du membre à ajouter
   * @param message Message optionnel
   */
  async addContact(userId: string, contactId: string, message?: string) {
    // Cette méthode est maintenant gérée par le ContactService
    // Elle est conservée pour la compatibilité mais devrait être supprimée
    return {
      success: true,
      message: 'Demande de contact envoyée',
      to: contactId,
      from: userId,
      customMessage: message
    };
  }

  /**
   * Retourne tous les membres (actifs et inactifs) pour l'admin
   */
  async findAllAdmin(): Promise<User[]> {
    return await this.userRepository.find({
      order: { created_at: 'DESC' }
    });
  }
} 