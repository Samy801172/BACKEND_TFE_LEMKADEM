"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.swaggerConfiguration = void 0;
var swagger_1 = require("@nestjs/swagger");
var SwaggerConfiguration = /** @class */ (function () {
    function SwaggerConfiguration() {
    }
    SwaggerConfiguration.prototype.config = function (app) {
        var config = new swagger_1.DocumentBuilder()
            .setTitle('NestJS API')
            .setDescription('NestJS swagger document')
            .setVersion('1.0')
            .addBearerAuth({
            description: "Please enter token",
            name: 'Authorization',
            bearerFormat: 'Bearer',
            scheme: 'Bearer',
            type: 'http',
            in: 'Header'
        }, 'access-token')
            .build();
        var document = swagger_1.SwaggerModule.createDocument(app, config);
        swagger_1.SwaggerModule.setup('docs', app, document);
    };
    return SwaggerConfiguration;
}());
var swaggerConfiguration = new SwaggerConfiguration();
exports.swaggerConfiguration = swaggerConfiguration;
