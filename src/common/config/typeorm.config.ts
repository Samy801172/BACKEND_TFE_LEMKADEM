import { TypeOrmModuleOptions } from '@nestjs/typeorm';
import { configManager } from './config.manager';
import { ConfigKey } from './enum';

// Définition de la configuration TypeORM pour NestJS
export const typeOrmConfig: TypeOrmModuleOptions = {
  // Type de base de données (ex: 'postgres', 'mysql', etc.)
  type: configManager.getValue(ConfigKey.DB_TYPE) as any,

  // Hôte de la base de données (ex: 'localhost')
  host: configManager.getValue(ConfigKey.DB_HOST),

  // Port de connexion à la base de données (ex: 5432 pour Postgres)
  port: parseInt(configManager.getValue(ConfigKey.DB_PORT), 10),

  // Nom d'utilisateur pour la connexion à la base de données
  username: configManager.getValue(ConfigKey.DB_USER),

  // Mot de passe pour la connexion à la base de données
  password: configManager.getValue(ConfigKey.DB_PASSWORD),

  // Nom de la base de données à utiliser
  database: configManager.getValue(ConfigKey.DB_DATABASE),

  // Chemin vers les entités (ORM) à charger
  entities: [__dirname + '/../../**/*.entity{.ts,.js}'],

  // Synchronisation automatique du schéma (à désactiver en production !)
  synchronize: true,

  // Affichage des logs d'erreur et d'avertissement
  logging: ['error', 'warn'],

  // Garde la connexion active même après un hot reload (utile en développement)
  keepConnectionAlive: true,

  // Charge automatiquement les entités (utile avec NestJS)
  autoLoadEntities: true,

  // Options supplémentaires pour la connexion
  extra: {
    connectionTimeoutMillis: 10000, // Timeout de connexion (ms)
    query_timeout: 10000,           // Timeout de requête (ms)
    // Configuration SSL pour Render PostgreSQL
    ssl: {
      rejectUnauthorized: false, // Accepte les certificats auto-signés
      ca: undefined,             // Pas de CA personnalisé
      key: undefined,            // Pas de clé privée
      cert: undefined            // Pas de certificat
    }
  },

  // N'exécute pas automatiquement les migrations au démarrage
  migrationsRun: false
};
