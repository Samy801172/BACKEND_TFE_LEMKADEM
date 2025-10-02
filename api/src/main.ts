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
    
    // CORS : autorise les requêtes du front local (localhost:4200), GitHub Pages (samy801172.github.io) et Flutter web
    // Indispensable pour que le frontend Angular déployé sur GitHub Pages puisse accéder à l'API sur Render
    // Et pour que l'app Flutter web puisse accéder à l'API
    app.enableCors({
      origin: (origin, callback) => {
        console.log('CORS origin:', origin); // Log l'origine reçue
        const allowedOrigins = [
          'https://samy801172.github.io',
          'http://localhost:4200',
          'http://localhost:56700', // Flutter web par défaut
          'http://localhost:56969', // Flutter web alternatif
          'http://localhost:59013', // Flutter web actuel
          'http://localhost:60263', // Flutter web actuel
          'http://localhost:61013', // Flutter web actuel
          'http://localhost:8080',  // Port alternatif
          'http://localhost:3000'   // Port alternatif
        ];
        // Autorise tous les ports localhost pour Flutter web
        if (
          !origin ||
          allowedOrigins.includes(origin) ||
          /^http:\/\/localhost:\d+$/.test(origin)
        ) {
          console.log('✅ CORS autorisé pour:', origin);
          callback(null, true);
        } else {
          console.log('❌ CORS refusé pour:', origin);
          callback(new Error('Not allowed by CORS'));
        }
      },
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

    // Expose le dossier uploads/ à l'URL /uploads (pour les factures PDF et pièces jointes des emails)
    // Cela permet d'accéder aux factures via http://localhost:2024/uploads/invoices/nomDeLaFacture.pdf
    console.log('Dossier statique exposé:', join(process.cwd(), 'uploads'));
    app.useStaticAssets(join(process.cwd(), 'uploads'), {
      prefix: '/uploads/',
    });

    // Expose le dossier uploads en statique
    app.use('/api/files', express.static(join(__dirname, '..', 'uploads')));
    
    // Expose le dossier uploads/profiles pour les images de profil
    app.use('/api/files/profiles', express.static(join(__dirname, '..', 'uploads', 'profiles')));

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
      logger.log(`🚀 Serveur démarré sur le port ${port}`);
      logger.log(`📚 Documentation Swagger: http://localhost:${port}/api/docs`);
      logger.log(`🔗 API Base URL: http://localhost:${port}/api`);
    } catch (error) {
      logger.error(`❌ Échec du démarrage du serveur: ${error.message}`);
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
