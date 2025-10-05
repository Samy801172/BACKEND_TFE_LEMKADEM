import { Test, TestingModule } from '@nestjs/testing';
import { MessageController } from './message.controller';
import { MessageService } from './message.service';
import { CreateMessageDto } from './dto/create-message.dto';
import { Message } from './entities/message.entity';
import { getRepositoryToken } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { User } from '../User/entities/user.entity';
import { JwtAuthGuard } from '@feature/security/guards/jwt-auth.guard';

// Mock du service de messages
const mockMessageService = {
  create: jest.fn(),
  findAll: jest.fn(),
  findOne: jest.fn(),
  markAsRead: jest.fn(),
  getConversations: jest.fn(),
  getConversationMessages: jest.fn(),
  findUnread: jest.fn(),
  deleteMessage: jest.fn(),
  markAllAsRead: jest.fn()
};

// Mock du guard JWT
const mockJwtAuthGuard = {
  canActivate: jest.fn().mockImplementation(() => true)
};

describe('MessageController', () => {
  let controller: MessageController;
  let service: MessageService;

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      controllers: [MessageController],
      providers: [
        {
          provide: MessageService,
          useValue: mockMessageService
        },
        {
          provide: getRepositoryToken(Message),
          useClass: Repository
        },
        {
          provide: getRepositoryToken(User),
          useClass: Repository
        }
      ]
    })
    .overrideGuard(JwtAuthGuard)
    .useValue(mockJwtAuthGuard)
    .compile();

    controller = module.get<MessageController>(MessageController);
    service = module.get<MessageService>(MessageService);
  });

  it('should be defined', () => {
    expect(controller).toBeDefined();
  });

  describe('create', () => {
    it('should create a new message', async () => {
      // Arrange
      const userId = 'test-user-id';
      const createMessageDto: CreateMessageDto = {
        content: 'Test message',
        receiverId: 'receiver-id'
      };
      const expectedResult = { id: 'message-id', content: 'Test message' } as any;
      mockMessageService.create.mockResolvedValue(expectedResult);

      // Act
      const result = await controller.create({ user: { id: userId } }, createMessageDto);

      // Assert
      expect(service.create).toHaveBeenCalledWith(userId, createMessageDto);
      expect(result).toEqual(expectedResult);
    });
  });

  describe('findAll', () => {
    it('should return all messages with pagination', async () => {
      // Arrange
      const userId = 'test-user-id';
      const page = 1;
      const limit = 10;
      const expectedResult = {
        data: [{ id: 'message-id', content: 'Test message' }],
        meta: { total: 1, page, limit, pageCount: 1 }
      };
      mockMessageService.findAll.mockResolvedValue(expectedResult);

      // Act
      const result = await controller.findAll({ user: { id: userId } }, page, limit);

      // Assert
      expect(service.findAll).toHaveBeenCalledWith(userId, { page, limit });
      expect(result).toEqual(expectedResult);
    });
  });

  describe('findOne', () => {
    it('should return a single message by id', async () => {
      // Arrange
      const messageId = 'message-id';
      const expectedResult = { id: messageId, content: 'Test message' } as any;
      mockMessageService.findOne.mockResolvedValue(expectedResult);

      // Act
      const result = await controller.findOne(messageId);

      // Assert
      expect(service.findOne).toHaveBeenCalledWith(messageId);
      expect(result).toEqual(expectedResult);
    });
  });

  describe('getConversations', () => {
    it('should return all conversations', async () => {
      // Arrange
      const userId = 'test-user-id';
      const expectedResult = [
        {
          contact: { id: 'contact-id', nom: 'Doe', prenom: 'John' },
          lastMessage: { id: 'message-id', content: 'Hello' },
          unreadCount: 0
        }
      ];
      mockMessageService.getConversations.mockResolvedValue(expectedResult);

      // Act
      const result = await controller.getConversations({ user: { userId } });

      // Assert
      expect(service.getConversations).toHaveBeenCalledWith(userId);
      expect(result).toEqual(expectedResult);
    });
  });

  describe('getConversationMessages', () => {
    it('should return messages from a conversation with pagination', async () => {
      // Arrange
      const userId = 'test-user-id';
      const contactId = 'contact-id';
      const page = 1;
      const limit = 20;
      const expectedResult = {
        data: [{ id: 'message-id', content: 'Hello' }],
        meta: { total: 1, page, limit, pageCount: 1, unreadMarked: 0 }
      };
      mockMessageService.getConversationMessages.mockResolvedValue(expectedResult);

      // Act
      const result = await controller.getConversationMessages(
        { user: { userId } },
        contactId,
        page,
        limit
      );

      // Assert
      expect(service.getConversationMessages).toHaveBeenCalledWith(
        userId,
        contactId,
        { page, limit }
      );
      expect(result).toEqual(expectedResult);
    });
  });

  describe('findUnread', () => {
    it('should return all unread messages', async () => {
      // Arrange
      const userId = 'test-user-id';
      const expectedResult = [{ id: 'message-id', content: 'Hello', is_read: false }];
      mockMessageService.findUnread.mockResolvedValue(expectedResult);

      // Act
      const result = await controller.getUnreadMessages({ user: { userId } });

      // Assert
      expect(service.findUnread).toHaveBeenCalledWith(userId);
      expect(result).toEqual(expectedResult);
    });
  });

  describe('deleteMessage', () => {
    it('should delete a message and return success', async () => {
      // Arrange
      const userId = 'test-user-id';
      const messageId = 'message-id';
      const expectedResult = { success: true, message: 'Message deleted successfully' };
      mockMessageService.deleteMessage.mockResolvedValue(expectedResult);

      // Act
      const result = await controller.deleteMessage({ user: { userId } }, messageId);

      // Assert
      expect(service.deleteMessage).toHaveBeenCalledWith(userId, messageId);
      expect(result).toEqual(expectedResult);
    });
  });

  describe('markAllAsRead', () => {
    it('should mark all messages in a conversation as read', async () => {
      // Arrange
      const userId = 'test-user-id';
      const contactId = 'contact-id';
      const expectedResult = { count: 5 };
      mockMessageService.markAllAsRead.mockResolvedValue(expectedResult);

      // Act
      const result = await controller.markAllAsRead({ user: { userId } }, contactId);

      // Assert
      expect(service.markAllAsRead).toHaveBeenCalledWith(userId, contactId);
      expect(result).toEqual(expectedResult);
    });
  });
}); 