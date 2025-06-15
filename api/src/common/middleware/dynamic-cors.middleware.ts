import { Injectable, NestMiddleware } from '@nestjs/common';

/**
 * Middleware CORS dynamique pour NestJS
 * Gère les requêtes OPTIONS (préflight) et autorise dynamiquement les origines (localhost + prod)
 */
@Injectable()
export class DynamicCorsMiddleware implements NestMiddleware {
  use(req: any, res: any, next: () => void) {
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
  }
} 