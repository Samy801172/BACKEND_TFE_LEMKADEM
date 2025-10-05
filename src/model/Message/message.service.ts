import { Injectable, NotFoundException, ForbiddenException } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { Message } from './entities/message.entity';
import { CreateMessageDto } from './dto/create-message.dto';
import { User } from '../User/entities/user.entity';
import { NotificationService } from '../../common/services/notification.service';

@Injectable()
export class MessageService {
  constructor(
    @InjectRepository(Message)
    private readonly messageRepository: Repository<Message>,
    @InjectRepository(User)
    private readonly userRepository: Repository<User>,
    private readonly notificationService: NotificationService
  ) {}

  async create(senderId: string, createMessageDto: CreateMessageDto): Promise<Message> {
    try {
      // Vérifier que l'expéditeur et le destinataire existent
      const sender = await this.userRepository.findOne({ where: { id: senderId } });
      const receiver = await this.userRepository.findOne({ where: { id: createMessageDto.receiverId } });
      
      if (!sender || !receiver) {
        throw new NotFoundException(
          !sender ? 'Expéditeur non trouvé' : 'Destinataire non trouvé'
        );
      }
      
      // Créer et sauvegarder le message avec des références complètes
      const message = this.messageRepository.create({
        content: createMessageDto.content,
        sender: sender,
        receiver: receiver,
        is_read: false
      });
      
      const savedMessage = await this.messageRepository.save(message);
      
      // Envoyer une notification au destinataire
      try {
        await this.notificationService.sendNewMessageNotification(
          createMessageDto.receiverId,
          `${sender.prenom} ${sender.nom}`,
          senderId,
          createMessageDto.content
        );
      } catch (error) {
        console.error('Erreur lors de l\'envoi de la notification:', error);
      }
      
      return savedMessage;
    } catch (error) {
      // DEBUG: Erreur lors de la création du message (à activer uniquement en développement)
      // console.error('Erreur lors de la création du message:', error);
      throw error;
    }
  }

  /**
   * Récupère tous les messages d'un utilisateur avec pagination
   * 
   * @param userId ID de l'utilisateur
   * @param options Options de pagination {page, limit}
   * @returns Messages paginés
   */
  async findAll(userId: string, options?: { page: number; limit: number }): Promise<any> {
    const { page = 1, limit = 10 } = options || {};
    const skip = (page - 1) * limit;
    
    const [messages, total] = await this.messageRepository.findAndCount({
      where: [
        { sender: { id: userId } },
        { receiver: { id: userId } }
      ],
      relations: ['sender', 'receiver'],
      order: { createdAt: 'DESC' },
      skip,
      take: limit
    });
    
    return {
      data: messages,
      meta: {
        total,
        page,
        limit,
        pageCount: Math.ceil(total / limit)
      }
    };
  }

  async findOne(id: string): Promise<Message> {
    const message = await this.messageRepository.findOne({
      where: { id },
      relations: ['sender', 'receiver']
    });
    if (!message) {
      throw new NotFoundException('Message not found');
    }
    return message;
  }

  /**
   * Supprime un message
   * Seul l'expéditeur peut supprimer son message
   * 
   * @param userId ID de l'utilisateur qui tente de supprimer
   * @param messageId ID du message à supprimer
   * @returns Confirmation de suppression
   */
  async deleteMessage(userId: string, messageId: string): Promise<{ success: boolean; message: string; deletedAs: 'sender' | 'receiver' }> {
    const message = await this.messageRepository.findOne({
      where: { id: messageId },
      relations: ['sender', 'receiver']
    });
    
    if (!message) {
      throw new NotFoundException('Message not found');
    }
    
    // Permet la suppression si l'utilisateur est l'expéditeur OU le destinataire
    if (message.sender.id !== userId && message.receiver.id !== userId) {
      throw new ForbiddenException('You can only delete messages you sent or received');
    }
    
    const deletedAs = message.sender.id === userId ? 'sender' : 'receiver';
    await this.messageRepository.remove(message);
    return { success: true, message: 'Message deleted successfully', deletedAs };
  }

  async findUserMessages(userId: string): Promise<Message[]> {
    return await this.messageRepository.find({
      where: [
        { sender: { id: userId } },
        { receiver: { id: userId } }
      ],
      relations: ['sender', 'receiver']
    });
  }

  async markAsRead(id: string): Promise<Message> {
    const message = await this.findOne(id);
    message.is_read = true;
    return await this.messageRepository.save(message);
  }

  /**
   * Marque tous les messages d'une conversation comme lus
   * 
   * @param userId ID de l'utilisateur (destinataire)
   * @param contactId ID du contact (expéditeur)
   * @returns Nombre de messages marqués comme lus
   */
  async markAllAsRead(userId: string, contactId: string): Promise<{ count: number }> {
    // Trouver tous les messages non lus de cette conversation
    const unreadMessages = await this.messageRepository.find({
      where: {
        receiver: { id: userId },
        sender: { id: contactId },
        is_read: false
      }
    });
    
    if (unreadMessages.length === 0) {
      return { count: 0 };
    }
    
    // Marquer tous comme lus
    unreadMessages.forEach(message => {
      message.is_read = true;
    });
    
    await this.messageRepository.save(unreadMessages);
    return { count: unreadMessages.length };
  }

  /**
   * Récupère toutes les conversations d'un utilisateur
   * Pour chaque contact avec qui l'utilisateur a échangé:
   * - Récupère les informations du contact
   * - Récupère le dernier message échangé
   * - Compte le nombre de messages non lus
   * 
   * @param userId ID de l'utilisateur
   * @returns Liste des conversations avec le dernier message et le nombre de non lus
   */
  async getConversations(userId: string) {
    try {
    // 1. Récupérer tous les messages envoyés ou reçus par l'utilisateur
    const allMessages = await this.messageRepository.find({
      where: [
        { sender: { id: userId } },
        { receiver: { id: userId } }
      ],
      relations: ['sender', 'receiver'],
      order: { createdAt: 'DESC' }
    });
    
    // 2. Identifier les contacts uniques
    const contactIds = new Set<string>();
    allMessages.forEach(msg => {
      const contactId = msg.sender.id === userId ? msg.receiver.id : msg.sender.id;
      contactIds.add(contactId);
    });
    
    // 3. Construire les conversations
    const conversations = [];
    for (const contactId of contactIds) {
      // Récupérer les informations du contact
      const contact = await this.userRepository.findOne({ where: { id: contactId } });
      
      if (!contact) {
        console.warn(`Contact non trouvé: ${contactId}`);
        continue; // Passer au contact suivant
      }
      
      // Trouver le dernier message échangé avec ce contact
      const lastMessage = allMessages.find(msg => 
        (msg.sender.id === userId && msg.receiver.id === contactId) || 
        (msg.sender.id === contactId && msg.receiver.id === userId)
      );
      
      if (!lastMessage) {
        console.warn(`Aucun message trouvé pour le contact: ${contactId}`);
        continue; // Passer au contact suivant
      }
      
      // Compter les messages non lus
      const unreadCount = await this.countUnreadMessages(userId, contactId);
      
      // Ajouter la conversation
      conversations.push({
        contact: {
          id: contact.id,
          nom: contact.nom,
          prenom: contact.prenom,
          email: contact.email
        },
        lastMessage: {
          id: lastMessage.id,
          content: lastMessage.content,
          createdAt: lastMessage.createdAt,
          isRead: lastMessage.is_read,
          isOutgoing: lastMessage.sender.id === userId
        },
        unreadCount
      });
    }
    
    // 4. Trier par date du dernier message (plus récent en premier)
    return conversations.sort((a, b) => 
      new Date(b.lastMessage.createdAt).getTime() - new Date(a.lastMessage.createdAt).getTime()
    );
    } catch (error) {
      console.error('Erreur lors de la récupération des conversations:', error);
      throw error;
    }
  }
  
  /**
   * Compte le nombre de messages non lus envoyés par un contact à l'utilisateur
   * 
   * @param userId ID de l'utilisateur
   * @param senderId ID de l'expéditeur (contact)
   * @returns Nombre de messages non lus
   */
  async countUnreadMessages(userId: string, senderId: string) {
    return this.messageRepository.count({
      where: {
        receiver: { id: userId },
        sender: { id: senderId },
        is_read: false
      }
    });
  }
  
  /**
   * Récupère tous les messages échangés entre l'utilisateur et un contact avec pagination
   * Les messages reçus sont automatiquement marqués comme lus
   * 
   * @param userId ID de l'utilisateur
   * @param contactId ID du contact
   * @param options Options de pagination {page, limit}
   * @returns Liste des messages paginés, triés par date croissante
   */
  async getConversationMessages(
    userId: string, 
    contactId: string,
    options?: { page: number; limit: number }
  ) {
    const { page = 1, limit = 20 } = options || {};
    const skip = (page - 1) * limit;
    
    // 1. Récupérer les messages de la conversation avec pagination
    const [messages, total] = await this.messageRepository.findAndCount({
      where: [
        { sender: { id: userId }, receiver: { id: contactId } },
        { sender: { id: contactId }, receiver: { id: userId } }
      ],
      relations: ['sender', 'receiver'],
      order: { createdAt: 'ASC' },
      skip,
      take: limit
    });
    
    // 2. Marquer comme lus les messages reçus non lus
    const unreadMessages = messages.filter(m => 
      m.receiver.id === userId && !m.is_read
    );
    
    if (unreadMessages.length > 0) {
      unreadMessages.forEach(m => m.is_read = true);
      await this.messageRepository.save(unreadMessages);
    }
    
    // 3. Retourner les messages avec métadonnées de pagination
    return {
      data: messages,
      meta: {
        total,
        page,
        limit,
        pageCount: Math.ceil(total / limit),
        unreadMarked: unreadMessages.length
      }
    };
  }
  
  /**
   * Récupère tous les messages non lus de l'utilisateur
   * 
   * @param userId ID de l'utilisateur
   * @returns Liste des messages non lus
   */
  async findUnread(userId: string): Promise<Message[]> {
    return await this.messageRepository.find({
      where: {
        receiver: { id: userId },
        is_read: false
      },
      relations: ['sender', 'receiver'],
      order: { createdAt: 'DESC' }
    });
  }

  /**
   * Récupère tous les messages reçus par l'utilisateur
   * @param userId ID de l'utilisateur connecté
   * @returns Liste des messages reçus, triés du plus récent au plus ancien
   */
  async getReceivedMessages(userId: string): Promise<Message[]> {
    return this.messageRepository.find({
      where: { receiver: { id: userId } },
      relations: ['sender'],
      order: { createdAt: 'DESC' }
    });
  }

  /**
   * Récupère tous les messages envoyés par l'utilisateur
   * @param userId ID de l'utilisateur connecté
   * @returns Liste des messages envoyés, triés du plus récent au plus ancien
   */
  async getSentMessages(userId: string): Promise<Message[]> {
    return this.messageRepository.find({
      where: { sender: { id: userId } },
      relations: ['receiver'],
      order: { createdAt: 'DESC' }
    });
  }
} 