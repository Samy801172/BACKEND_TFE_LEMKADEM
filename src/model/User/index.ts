// Centralise les exports du module User (service, controller, entités, DTO)
// Export du module principal User
export * from './user.module';
// Export du service User (logique métier)
export * from './user.service';
// Export du contrôleur User (routes API)
export * from './user.controller';
// Export de l'entité User (structure DB)
export * from './entities/user.entity';
// Export de l'énumération des rôles utilisateur
export * from './entities/user-role.enum';
// Export du DTO de création d'utilisateur
export * from './dto/create-user.dto';
// Export du DTO de mise à jour d'utilisateur
export * from './dto/update-user.dto'; 