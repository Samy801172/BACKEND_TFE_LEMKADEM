"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.swaggerConfiguration = void 0;
const swagger_1 = require("@nestjs/swagger");
exports.swaggerConfiguration = {
    config: (app) => {
        const config = new swagger_1.DocumentBuilder()
            .setTitle('API Documentation')
            .setDescription('Documentation de l\'API')
            .setVersion('1.0')
            .addBearerAuth()
            .build();
        const document = swagger_1.SwaggerModule.createDocument(app, config);
        swagger_1.SwaggerModule.setup('api/docs', app, document);
    }
};
//# sourceMappingURL=swagger.config.js.map