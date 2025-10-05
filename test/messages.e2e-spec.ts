import { Test, TestingModule } from '@nestjs/testing';
import { INestApplication } from '@nestjs/common';
import * as request from 'supertest';
import { AppModule } from '../src/feature/root/app.module';
import { getRepositoryToken } from '@nestjs/typeorm';
import { Message } from '../src/model/Message/entities/message.entity';
import { User } from '../src/model/User/entities/user.entity';
import { JwtService } from '@nestjs/jwt';

describe('MessageController (e2e)', () => {
  let app: INestApplication;
  let jwtService: JwtService;
  let messageRepository;
  let userRepository;
  let authToken: string;
  
  // Données de test
  const testUser = {
    id: '123e4567-e89b-12d3-a456-426614174000',
    email: 'test@example.com',
    nom: 'Doe',
    prenom: 'John'
  };
  
  const testContact = {
    id: '123e4567-e89b-12d3-a456-426614174001',
    email: 'contact@example.com',
    nom: 'Smith',
    prenom: 'Jane'
  };
  
  const testMessage = {
    id: '123e4567-e89b-12d3-a456-426614174002',
    content: 'Test message',
    is_read: false,
    createdAt: new Date(),
    sender: testUser,
    receiver: testContact
  };

  beforeAll(async () => {
    const moduleFixture: TestingModule = await Test.createTestingModule({
      imports: [AppModule],
    }).compile();

    app = moduleFixture.createNestApplication();
    await app.init();
    
    jwtService = moduleFixture.get<JwtService>(JwtService);
    messageRepository = moduleFixture.get(getRepositoryToken(Message));
    userRepository = moduleFixture.get(getRepositoryToken(User));
    
    // Créer un token JWT pour authentifier les requêtes
    authToken = jwtService.sign({ 
      userId: testUser.id,
      email: testUser.email
    });
  });

  beforeEach(async () => {
    // Nettoyer et initialiser les données de test
    await messageRepository.clear();
    await userRepository.clear();
    
    // Créer utilisateurs de test
    await userRepository.save([testUser, testContact]);
    
    // Créer un message de test
    await messageRepository.save(testMessage);
  });

  afterAll(async () => {
    await app.close();
  });

  describe('/messages (GET)', () => {
    it('should return paginated messages', () => {
      return request(app.getHttpServer())
        .get('/messages')
        .set('Authorization', `Bearer ${authToken}`)
        .expect(200)
        .expect(res => {
          expect(res.body).toHaveProperty('data');
          expect(res.body).toHaveProperty('meta');
          expect(res.body.data).toBeInstanceOf(Array);
          expect(res.body.meta).toHaveProperty('total');
          expect(res.body.meta).toHaveProperty('page');
          expect(res.body.meta).toHaveProperty('limit');
        });
    });
  });
  
  describe('/messages/conversations (GET)', () => {
    it('should return user conversations', () => {
      return request(app.getHttpServer())
        .get('/messages/conversations')
        .set('Authorization', `Bearer ${authToken}`)
        .expect(200)
        .expect(res => {
          expect(Array.isArray(res.body)).toBe(true);
          if (res.body.length > 0) {
            expect(res.body[0]).toHaveProperty('contact');
            expect(res.body[0]).toHaveProperty('lastMessage');
            expect(res.body[0]).toHaveProperty('unreadCount');
          }
        });
    });
  });
  
  describe('/messages/conversation/:contactId (GET)', () => {
    it('should return conversation messages with pagination', () => {
      return request(app.getHttpServer())
        .get(`/messages/conversation/${testContact.id}`)
        .set('Authorization', `Bearer ${authToken}`)
        .expect(200)
        .expect(res => {
          expect(res.body).toHaveProperty('data');
          expect(res.body).toHaveProperty('meta');
          expect(res.body.data).toBeInstanceOf(Array);
          expect(res.body.meta).toHaveProperty('total');
          expect(res.body.meta).toHaveProperty('unreadMarked');
        });
    });
  });
  
  describe('/messages (POST)', () => {
    it('should create a new message', () => {
      const newMessage = {
        content: 'Hello from e2e test',
        receiverId: testContact.id
      };
      
      return request(app.getHttpServer())
        .post('/messages')
        .set('Authorization', `Bearer ${authToken}`)
        .send(newMessage)
        .expect(201)
        .expect(res => {
          expect(res.body).toHaveProperty('id');
          expect(res.body.content).toBe(newMessage.content);
        });
    });
  });
  
  describe('/messages/unread (GET)', () => {
    it('should return unread messages', () => {
      return request(app.getHttpServer())
        .get('/messages/unread')
        .set('Authorization', `Bearer ${authToken}`)
        .expect(200)
        .expect(res => {
          expect(Array.isArray(res.body)).toBe(true);
          res.body.forEach(message => {
            expect(message.is_read).toBe(false);
          });
        });
    });
  });
  
  describe('/messages/:id (DELETE)', () => {
    it('should delete a message', async () => {
      // Créer un message à supprimer
      const messageToDelete = await messageRepository.save({
        content: 'Message to delete',
        is_read: false,
        createdAt: new Date(),
        sender: testUser,
        receiver: testContact
      });
      
      return request(app.getHttpServer())
        .delete(`/messages/${messageToDelete.id}`)
        .set('Authorization', `Bearer ${authToken}`)
        .expect(200)
        .expect(res => {
          expect(res.body).toHaveProperty('success', true);
          expect(res.body).toHaveProperty('message', 'Message deleted successfully');
        });
    });
  });
  
  describe('/messages/conversation/:contactId/read-all (PATCH)', () => {
    it('should mark all messages as read', async () => {
      // Créer des messages non lus à marquer comme lus
      await messageRepository.save([
        {
          content: 'Unread message 1',
          is_read: false,
          createdAt: new Date(),
          sender: testContact,
          receiver: testUser
        },
        {
          content: 'Unread message 2',
          is_read: false,
          createdAt: new Date(),
          sender: testContact,
          receiver: testUser
        }
      ]);
      
      return request(app.getHttpServer())
        .patch(`/messages/conversation/${testContact.id}/read-all`)
        .set('Authorization', `Bearer ${authToken}`)
        .expect(200)
        .expect(res => {
          expect(res.body).toHaveProperty('count');
          expect(res.body.count).toBeGreaterThan(0);
        });
    });
  });
}); 