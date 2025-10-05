import { Test, TestingModule } from '@nestjs/testing';
import { MessageService } from './message.service';
import { getRepositoryToken } from '@nestjs/typeorm';
import { Message } from './entities/message.entity';
import { User } from '../User/entities/user.entity';
import { ForbiddenException, NotFoundException } from '@nestjs/common';
import { Repository } from 'typeorm';

// Mocks pour les repositories
const mockMessagesRepository = {
  create: jest.fn(),
  save: jest.fn(),
  find: jest.fn(),
  findOne: jest.fn(),
  findAndCount: jest.fn(),
  count: jest.fn(),
  remove: jest.fn()
};

const mockUsersRepository = {
  findOne: jest.fn()
};

describe('MessageService', () => {
  let service: MessageService;
  let messagesRepository;
  let usersRepository;

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      providers: [
        MessageService,
        {
          provide: getRepositoryToken(Message),
          useValue: mockMessagesRepository
        },
        {
          provide: getRepositoryToken(User),
          useValue: mockUsersRepository
        }
      ],
    }).compile();

    service = module.get<MessageService>(MessageService);
    messagesRepository = module.get(getRepositoryToken(Message));
    usersRepository = module.get(getRepositoryToken(User));
    
    // Reset des mocks avant chaque test
    jest.clearAllMocks();
  });

  it('should be defined', () => {
    expect(service).toBeDefined();
  });

  describe('create', () => {
    it('should create a new message', async () => {
      // Arrange
      const senderId = 'sender-id';
      const receiverId = 'receiver-id';
      const content = 'Test message';
      const createMessageDto = { content, receiverId };
      const newMessage = { id: 'message-id', content, sender: { id: senderId }, receiver: { id: receiverId } };
      
      mockMessagesRepository.create.mockReturnValue(newMessage);
      mockMessagesRepository.save.mockResolvedValue(newMessage);

      // Act
      const result = await service.create(senderId, createMessageDto);

      // Assert
      expect(messagesRepository.create).toHaveBeenCalledWith({
        content,
        sender: { id: senderId },
        receiver: { id: receiverId }
      });
      expect(messagesRepository.save).toHaveBeenCalledWith(newMessage);
      expect(result).toEqual(newMessage);
    });
  });

  describe('findAll', () => {
    it('should return paginated messages for a user', async () => {
      // Arrange
      const userId = 'user-id';
      const page = 1;
      const limit = 10;
      const messages = [
        { id: 'message1', content: 'Hello' },
        { id: 'message2', content: 'World' }
      ];
      const total = 2;
      
      mockMessagesRepository.findAndCount.mockResolvedValue([messages, total]);

      // Act
      const result = await service.findAll(userId, { page, limit });

      // Assert
      expect(messagesRepository.findAndCount).toHaveBeenCalledWith({
        where: [
          { sender: { id: userId } },
          { receiver: { id: userId } }
        ],
        relations: ['sender', 'receiver'],
        order: { createdAt: 'DESC' },
        skip: 0,
        take: 10
      });
      
      expect(result).toEqual({
        data: messages,
        meta: {
          total,
          page,
          limit,
          pageCount: 1
        }
      });
    });
  });

  describe('findOne', () => {
    it('should return a message by id', async () => {
      // Arrange
      const messageId = 'message-id';
      const message = { id: messageId, content: 'Test message' };
      
      mockMessagesRepository.findOne.mockResolvedValue(message);

      // Act
      const result = await service.findOne(messageId);

      // Assert
      expect(messagesRepository.findOne).toHaveBeenCalledWith({
        where: { id: messageId },
        relations: ['sender', 'receiver']
      });
      expect(result).toEqual(message);
    });

    it('should throw NotFoundException when message is not found', async () => {
      // Arrange
      const messageId = 'non-existent-id';
      
      mockMessagesRepository.findOne.mockResolvedValue(null);

      // Act & Assert
      await expect(service.findOne(messageId)).rejects.toThrow(NotFoundException);
      expect(messagesRepository.findOne).toHaveBeenCalledWith({
        where: { id: messageId },
        relations: ['sender', 'receiver']
      });
    });
  });

  describe('deleteMessage', () => {
    it('should delete a message when user is the sender', async () => {
      // Arrange
      const userId = 'user-id';
      const messageId = 'message-id';
      const message = { id: messageId, content: 'Test', sender: { id: userId } };
      
      mockMessagesRepository.findOne.mockResolvedValue(message);
      mockMessagesRepository.remove.mockResolvedValue(message);

      // Act
      const result = await service.deleteMessage(userId, messageId);

      // Assert
      expect(messagesRepository.findOne).toHaveBeenCalledWith({
        where: { id: messageId },
        relations: ['sender']
      });
      expect(messagesRepository.remove).toHaveBeenCalledWith(message);
      expect(result).toEqual({ success: true, message: 'Message deleted successfully' });
    });

    it('should throw ForbiddenException when user is not the sender', async () => {
      // Arrange
      const userId = 'user-id';
      const messageId = 'message-id';
      const message = { id: messageId, content: 'Test', sender: { id: 'other-user-id' } };
      
      mockMessagesRepository.findOne.mockResolvedValue(message);

      // Act & Assert
      await expect(service.deleteMessage(userId, messageId)).rejects.toThrow(ForbiddenException);
      expect(messagesRepository.findOne).toHaveBeenCalledWith({
        where: { id: messageId },
        relations: ['sender']
      });
      expect(messagesRepository.remove).not.toHaveBeenCalled();
    });
  });

  describe('markAllAsRead', () => {
    it('should mark all messages as read and return count', async () => {
      // Arrange
      const userId = 'user-id';
      const contactId = 'contact-id';
      const unreadMessages = [
        { id: 'message1', is_read: false },
        { id: 'message2', is_read: false }
      ];
      
      mockMessagesRepository.find.mockResolvedValue(unreadMessages);
      mockMessagesRepository.save.mockResolvedValue([
        { id: 'message1', is_read: true },
        { id: 'message2', is_read: true }
      ]);

      // Act
      const result = await service.markAllAsRead(userId, contactId);

      // Assert
      expect(messagesRepository.find).toHaveBeenCalledWith({
        where: {
          receiver: { id: userId },
          sender: { id: contactId },
          is_read: false
        }
      });
      expect(messagesRepository.save).toHaveBeenCalledWith([
        { id: 'message1', is_read: true },
        { id: 'message2', is_read: true }
      ]);
      expect(result).toEqual({ count: 2 });
    });

    it('should return count 0 when no unread messages', async () => {
      // Arrange
      const userId = 'user-id';
      const contactId = 'contact-id';
      
      mockMessagesRepository.find.mockResolvedValue([]);

      // Act
      const result = await service.markAllAsRead(userId, contactId);

      // Assert
      expect(messagesRepository.find).toHaveBeenCalledWith({
        where: {
          receiver: { id: userId },
          sender: { id: contactId },
          is_read: false
        }
      });
      expect(messagesRepository.save).not.toHaveBeenCalled();
      expect(result).toEqual({ count: 0 });
    });
  });
}); 