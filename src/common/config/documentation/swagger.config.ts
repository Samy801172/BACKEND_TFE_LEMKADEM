import { INestApplication } from '@nestjs/common';
import { DocumentBuilder, SwaggerModule } from '@nestjs/swagger';

export const swaggerConfiguration = {
  config: (app: INestApplication) => {
    const config = new DocumentBuilder()
      .setTitle('API Documentation')
      .setDescription('Documentation de l\'API')
      .setVersion('1.0')
      .addBearerAuth()
      .build();

    const document = SwaggerModule.createDocument(app, config);
    SwaggerModule.setup('api/docs', app, document);
  }
}; 