import { TypeOrmModuleOptions } from '@nestjs/typeorm';
import { ConfigKey } from "./enum";
import { ConfigKey as ConfigKeyEnum } from './enum/config.key';
declare class ConfigManager {
    private config;
    constructor();
    private setupJwtConfig;
    private ensureValues;
    getTypeOrmConfig(): TypeOrmModuleOptions;
    getValue(key: ConfigKey): string;
    getValueEnum(key: ConfigKeyEnum): any;
}
export declare const configManager: ConfigManager;
export {};
