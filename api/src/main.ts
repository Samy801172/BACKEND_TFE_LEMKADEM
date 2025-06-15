// Point d'entrée principal de l'application NestJS. Configure les middlewares, la sécurité, la documentation Swagger et démarre le serveur.
import { NestFactory } from '@nestjs/core';
import { ApiInterceptor, HttpExceptionFilter, swaggerConfiguration } from '@common/config';
import { ValidationPipe, Logger, BadRequestException } from '@nestjs/common';
import { configManager } from '@common/config';
import { ConfigKey } from '@common/config/enum';
import { AppModule } from './feature';
import helmet from 'helmet';
import { rateLimit } from 'express-rate-limit';
import { json } from 'express';
import * as express from 'express';
import { join } from 'path';
import { NestExpressApplication } from '@nestjs/platform-express';

const bootstrap = async () => {
  try {
    const app = await NestFactory.create<NestExpressApplication>(AppModule, {
      logger: ['error', 'warn', 'debug', 'log', 'verbose'], // Activer tous les niveaux de log
      rawBody: true // Ajouter cette ligne
    });
    
    // Middleware OPTIONS tout de suite après la création de l'app
    app.use((req, res, next) => {
      // Liste des origines autorisées (localhost pour dev, GitHub Pages pour prod)
      const allowedOrigins = ['http://localhost:4200', 'https://samy801172.github.io'];
      const origin = req.headers.origin;
      if (req.method === 'OPTIONS') {
        // Si l'origine de la requête est autorisée, on l'ajoute dans le header
        if (allowedOrigins.includes(origin)) {
          res.header('Access-Control-Allow-Origin', origin);
        }
        // Autoriser les méthodes et headers nécessaires
        res.header('Access-Control-Allow-Methods', 'GET,HEAD,PUT,PATCH,POST,DELETE,OPTIONS');
        res.header('Access-Control-Allow-Headers', 'Content-Type, Accept, Authorization, stripe-signature');
        res.header('Access-Control-Allow-Credentials', 'true');
        // Répondre immédiatement pour les préflight requests
        return res.sendStatus(204);
      }
      next();
    });

    // CORS : autorise les requêtes du front local (localhost:4200) et de GitHub Pages (samy801172.github.io)
    // Indispensable pour que le frontend Angular déployé sur GitHub Pages puisse accéder à l'API sur Render
    app.enableCors({
      origin: ['http://localhost:4200','https://samy801172.github.io','https://samy801172.github.io/api'], // Permettre uniquement l'origine du front
      methods: 'GET,HEAD,PUT,PATCH,POST,DELETE,OPTIONS',
      allowedHeaders: ['Content-Type', 'Accept', 'Authorization', 'stripe-signature'],
      credentials: true,
      preflightContinue: false,
      optionsSuccessStatus: 204
    });

    // Désactiver temporairement helmet pour le développement
    // app.use(helmet());

    // Limite le nombre de requêtes par IP
    app.use(rateLimit({
      windowMs: 15 * 60 * 1000, // 15 minute window
      max: process.env.NODE_ENV === 'production' ? 100 : 1000 // 1000 en dev, 100 en prod
    }));

    // Configuration pour Stripe webhooks - AVANT les autres middlewares
    app.use(
      '/api/payments/webhook',
      express.raw({ type: 'application/json' }),
      (req, res, next) => {
        if (req.body) {
          req.rawBody = req.body;
        }
        next();
      }
    );

    // Configuration globale pour les autres routes - APRÈS le middleware webhook
    app.use(express.json());

    // Expose le dossier public/members à l'URL /membres
    // Cela permet d'accéder aux photos de profil uploadées via http://localhost:2024/membres/nomDeLaPhoto.jpg
    console.log('Dossier statique exposé:', join(process.cwd(), 'public', 'members'));
    app.useStaticAssets(join(process.cwd(), 'public', 'members'), {
      prefix: '/membres/',
    });

    app.useGlobalInterceptors(new ApiInterceptor());
    app.useGlobalFilters(new HttpExceptionFilter());
    app.setGlobalPrefix('api');
    app.useGlobalPipes(
      new ValidationPipe({
        exceptionFactory: (validationErrors = []) => {
          const messages = validationErrors.map(error => error.toString()).join(', ');
          throw new BadRequestException(messages);
        }
      })
    );

    swaggerConfiguration.config(app);

    const port = 2024; // Port fixé à 2024
    const logger: Logger = new Logger('Principal');
    
    try {
      // Modifier pour écouter sur toutes les interfaces
      await app.listen(port, '0.0.0.0');
      logger.log(`Serveur démarré sur le port ${port}`);
    } catch (error) {
      logger.error(`Échec du démarrage du serveur: ${error.message}`);
      throw error;
    }
  } catch (error) {
    console.error('Échec du démarrage de l\'application');
    console.error(error.message);
    // Ajout de logs détaillés pour les erreurs de base de données
    if (error.message.includes('1600 colonnes')) {
      console.error('Erreur de base de données: Le nombre maximum de colonnes (1600) a été dépassé. Veuillez vérifier vos définitions d\'entités et réduire le nombre de colonnes.');
    }
    process.exit(1);
  }
};

bootstrap();
