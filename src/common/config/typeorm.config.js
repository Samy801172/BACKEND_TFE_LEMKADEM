"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.typeOrmConfig = void 0;
const config_manager_1 = require("./config.manager");
const enum_1 = require("./enum");
exports.typeOrmConfig = {
    type: config_manager_1.configManager.getValue(enum_1.ConfigKey.DB_TYPE),
    host: config_manager_1.configManager.getValue(enum_1.ConfigKey.DB_HOST),
    port: parseInt(config_manager_1.configManager.getValue(enum_1.ConfigKey.DB_PORT), 10),
    username: config_manager_1.configManager.getValue(enum_1.ConfigKey.DB_USER),
    password: config_manager_1.configManager.getValue(enum_1.ConfigKey.DB_PASSWORD),
    database: config_manager_1.configManager.getValue(enum_1.ConfigKey.DB_DATABASE),
    entities: [__dirname + '/../../**/*.entity{.ts,.js}'],
    synchronize: true,
    logging: ['error', 'warn'],
    keepConnectionAlive: true,
    autoLoadEntities: true,
    extra: {
        connectionTimeoutMillis: 10000,
        query_timeout: 10000,
        ssl: {
            rejectUnauthorized: false,
            ca: undefined,
            key: undefined,
            cert: undefined
        }
    },
    migrationsRun: false
};
//# sourceMappingURL=typeorm.config.js.map