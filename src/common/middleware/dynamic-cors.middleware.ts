import { Injectable, NestMiddleware } from '@nestjs/common';

/**
 * Middleware CORS dynamique pour NestJS
 * Gère les requêtes OPTIONS (préflight) et autorise dynamiquement les origines (localhost + prod)
 */
@Injectable()
export class DynamicCorsMiddleware implements NestMiddleware {
  use(req: any, res: any, next: () => void) {
    console.log('[DynamicCorsMiddleware] Requête reçue:', req.method, req.path);
    
    // Liste des origines autorisées (localhost pour dev, GitHub Pages pour prod)
    const allowedOrigins = [
      'http://localhost:4200', 
      'http://localhost:56700', // Flutter web par défaut
      'http://localhost:56969', // Flutter web alternatif
      'http://localhost:59013', // Flutter web actuel
      'http://localhost:60263', // Flutter web actuel
      'http://localhost:61013', // Flutter web actuel
      'http://localhost:8080',  // Port alternatif
      'http://localhost:3000',  // Port alternatif
      'https://samy801172.github.io'
    ];
    
    const origin = req.headers.origin;
    console.log('[DynamicCorsMiddleware] Origin reçu:', origin);
    
    if (req.method === 'OPTIONS') {
      // Si l'origine de la requête est autorisée, on l'ajoute dans le header
      if (origin && allowedOrigins.includes(origin)) {
        res.header('Access-Control-Allow-Origin', origin);
        console.log('[DynamicCorsMiddleware] CORS autorisé pour:', origin);
      } else if (!origin) {
        // Si pas d'origine (requête locale), autoriser localhost
        res.header('Access-Control-Allow-Origin', 'http://localhost:4200');
        console.log('[DynamicCorsMiddleware] CORS autorisé pour localhost (pas d\'origine)');
      }
      
      // Autoriser les méthodes et headers nécessaires
      res.header('Access-Control-Allow-Methods', 'GET,HEAD,PUT,PATCH,POST,DELETE,OPTIONS');
      res.header('Access-Control-Allow-Headers', 'Content-Type, Accept, Authorization, stripe-signature');
      res.header('Access-Control-Allow-Credentials', 'true');
      
      // Répondre immédiatement pour les préflight requests
      return res.sendStatus(204);
    }
    
    // Pour les requêtes non-OPTIONS, gérer aussi le CORS
    if (origin && allowedOrigins.includes(origin)) {
      res.header('Access-Control-Allow-Origin', origin);
    } else if (!origin) {
      res.header('Access-Control-Allow-Origin', 'http://localhost:4200');
    }
    
    res.header('Access-Control-Allow-Credentials', 'true');
    
    next();
  }
} 