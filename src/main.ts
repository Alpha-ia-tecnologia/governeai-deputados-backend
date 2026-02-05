// Load environment variables FIRST (must be before any module imports)
import * as dotenv from 'dotenv';
dotenv.config();

import { NestFactory } from '@nestjs/core';
import { AppModule } from './app.module';
import { ValidationPipe } from '@nestjs/common';
import { AllExceptionsFilter } from './common/filters/http-exception.filter';

async function bootstrap() {
  const app = await NestFactory.create(AppModule);

  // Enable CORS - Allow frontend origins
  app.enableCors({
    origin: [
      'https://governeai-governe-ai-frontend.gkgtsp.easypanel.host',
      'http://localhost:8081',
      'http://localhost:19006',
      '*',
    ],
    methods: 'GET,HEAD,PUT,PATCH,POST,DELETE,OPTIONS',
    allowedHeaders: ['Content-Type', 'Authorization', 'ngrok-skip-browser-warning'],
    credentials: true,
    preflightContinue: false,
    optionsSuccessStatus: 204,
  });

  // Enable validation globally
  app.useGlobalPipes(
    new ValidationPipe({
      whitelist: true,
      transform: true,
      forbidNonWhitelisted: false,
      transformOptions: {
        enableImplicitConversion: true,
      },
    }),
  );

  // Add global exception filter
  app.useGlobalFilters(new AllExceptionsFilter());
  const port = process.env.PORT || 3750;
  await app.listen(port);
  console.log(`🚀 Backend rodando na porta ${port}`);
  console.log(`📊 Database: ${process.env.DATABASE_NAME} @ ${process.env.DATABASE_HOST}:${process.env.DATABASE_PORT}`);
}
bootstrap();
