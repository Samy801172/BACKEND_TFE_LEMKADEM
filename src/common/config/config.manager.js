"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.configManager = void 0;
const dotenv = require("dotenv");
const enum_1 = require("./enum");
const config_key_1 = require("./enum/config.key");
class ConfigManager {
    constructor() {
        this.config = new Map();
        dotenv.config();
        console.log('🔧 Configuration chargée depuis .env:');
        console.log('  DB_HOST:', process.env.DB_HOST);
        console.log('  DB_USER:', process.env.DB_USER);
        console.log('  DB_DATABASE:', process.env.DB_DATABASE);
        console.log('  DB_PASSWORD:', process.env.DB_PASSWORD ? '***' : 'NON DÉFINI');
        this.ensureValues(enum_1.configMinimalKeys);
        this.setupJwtConfig();
        const jwtSecret = process.env.JWT_TOKEN_SECRET;
        const jwtRefreshSecret = process.env.JWT_REFRESH_TOKEN_SECRET;
        if (!jwtSecret || jwtSecret.length < 32) {
            throw new Error('JWT_TOKEN_SECRET manquant ou trop court (min 32 caractères) dans .env');
        }
        if (!jwtRefreshSecret || jwtRefreshSecret.length < 32) {
            throw new Error('JWT_REFRESH_TOKEN_SECRET manquant ou trop court (min 32 caractères) dans .env');
        }
        this.config.set(config_key_1.ConfigKey.JWT_TOKEN_SECRET, jwtSecret);
        this.config.set(config_key_1.ConfigKey.JWT_TOKEN_EXPIRE_IN, process.env.JWT_TOKEN_EXPIRE_IN || '1h');
        this.config.set(config_key_1.ConfigKey.JWT_REFRESH_TOKEN_SECRET, jwtRefreshSecret);
        this.config.set(config_key_1.ConfigKey.JWT_REFRESH_TOKEN_EXPIRE_IN, process.env.JWT_REFRESH_TOKEN_EXPIRE_IN || '7d');
    }
    setupJwtConfig() {
    }
    ensureValues(keys) {
        keys.forEach(key => {
            this.getValue(key);
        });
    }
    getTypeOrmConfig() {
        return {
            type: this.getValue(enum_1.ConfigKey.DB_TYPE),
            host: this.getValue(enum_1.ConfigKey.DB_HOST),
            port: parseInt(this.getValue(enum_1.ConfigKey.DB_PORT)),
            username: this.getValue(enum_1.ConfigKey.DB_USER),
            password: this.getValue(enum_1.ConfigKey.DB_PASSWORD),
            database: this.getValue(enum_1.ConfigKey.DB_DATABASE),
            entities: [__dirname + '/../../**/*.entity{.ts,.js}'],
            synchronize: (this.getValue(enum_1.ConfigKey.DB_SYNC) === 'true'),
        };
    }
    getValue(key) {
        const value = process.env[key];
        if (!value) {
            if (key === enum_1.ConfigKey.DB_USER && process.env.DB_USERNAME) {
                return process.env.DB_USERNAME;
            }
            throw new Error(`config error - missing env.${key}`);
        }
        return value;
    }
    getValueEnum(key) {
        return this.config.get(key);
    }
}
exports.configManager = new ConfigManager();
//# sourceMappingURL=config.manager.js.map