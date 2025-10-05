import { DocumentBuilder, SwaggerModule } from '@nestjs/swagger';
import { INestApplication } from '@nestjs/common';

export const swaggerConfiguration = {
  config: (app: INestApplication) => {
    const config = new DocumentBuilder()
      .setTitle('API Documentation')
      .setDescription('API description')
      .setVersion('1.0')
      .addTag('default')  // Ajoutons un tag pour le AccountController
      .addTag('events')
      .addTag('reviews')
      .build();

    const document = SwaggerModule.createDocument(app, config);
    SwaggerModule.setup('docs', app, document);  // La documentation est disponible sur /docs
  },
}; 