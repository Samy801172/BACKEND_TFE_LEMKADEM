// Définit les différents rôles possibles dans l'application
export enum UserRole {
  ADMIN = 'ADMIN',        // Administrateur système
  ORGANIZER = 'ORGANIZER', // Peut créer et gérer des événements
  MEMBER = 'MEMBER',       // Utilisateur standard
  VISITOR = 'VISITOR'      // Visiteur avec accès limité
} 