import * as dotenv from 'dotenv';
import {TypeOrmModuleOptions} from '@nestjs/typeorm';
import { ConfigKey, configMinimalKeys } from "./enum";
import { ConfigKey as ConfigKeyEnum } from './enum/config.key';

class ConfigManager {
  private config: Map<string, any> = new Map();

  constructor() {
    dotenv.config();
    this.ensureValues(configMinimalKeys);
    
    // Configuration JWT avec validation stricte
    this.setupJwtConfig();
    
    // --- Correction : Rends les secrets obligatoires ---
    const jwtSecret = process.env.JWT_TOKEN_SECRET;
    const jwtRefreshSecret = process.env.JWT_REFRESH_TOKEN_SECRET;

    if (!jwtSecret || jwtSecret.length < 32) {
      throw new Error('JWT_TOKEN_SECRET manquant ou trop court (min 32 caractères) dans .env');
    }
    if (!jwtRefreshSecret || jwtRefreshSecret.length < 32) {
      throw new Error('JWT_REFRESH_TOKEN_SECRET manquant ou trop court (min 32 caractères) dans .env');
    }

    this.config.set(ConfigKeyEnum.JWT_TOKEN_SECRET, jwtSecret);
    this.config.set(ConfigKeyEnum.JWT_TOKEN_EXPIRE_IN, process.env.JWT_TOKEN_EXPIRE_IN || '1h');
    this.config.set(ConfigKeyEnum.JWT_REFRESH_TOKEN_SECRET, jwtRefreshSecret);
    this.config.set(ConfigKeyEnum.JWT_REFRESH_TOKEN_EXPIRE_IN, process.env.JWT_REFRESH_TOKEN_EXPIRE_IN || '7d');
  }

  private setupJwtConfig() {
    // DEBUG: Affichage de la configuration JWT au démarrage (à activer uniquement en développement)
    // console.log('Configuration JWT au démarrage:', {
    //   hasSecret: !!process.env.JWT_TOKEN_SECRET,
    //   hasExpireIn: !!process.env.JWT_TOKEN_EXPIRE_IN
    // });
  }

  private ensureValues(keys: ConfigKey[]) {
    keys.forEach(key => {
      this.getValue(key);
    });
  }

  public getTypeOrmConfig(): TypeOrmModuleOptions {
    return {
      type: this.getValue(ConfigKey.DB_TYPE) as any,
      host: this.getValue(ConfigKey.DB_HOST),
      port: parseInt(this.getValue(ConfigKey.DB_PORT)),
      username: this.getValue(ConfigKey.DB_USER),
      password: this.getValue(ConfigKey.DB_PASSWORD),
      database: this.getValue(ConfigKey.DB_DATABASE),
      entities: [__dirname + '/../../**/*.entity{.ts,.js}'],
      synchronize: (this.getValue(ConfigKey.DB_SYNC)=== 'true'),
    }
  }

  public getValue(key: ConfigKey): string {
    const value = process.env[key];
    if (!value) {
      // DEBUG: Warning: clé d'environnement non trouvée, tentative avec d'autres noms (à activer uniquement en développement)
      // Essayer d'autres noms possibles
      if (key === ConfigKey.DB_USER && process.env.DB_USERNAME) {
        return process.env.DB_USERNAME;
      }
      throw new Error(`config error - missing env.${key}`);
    }
    return value;
  }

  getValueEnum(key: ConfigKeyEnum): any {
    return this.config.get(key);
  }
}

export const configManager = new ConfigManager();