// Load environment variables FIRST (must be before any module imports)
import * as dotenv from 'dotenv';
dotenv.config();

import { NestFactory } from '@nestjs/core';
import { AppModule } from './app.module';
import { ValidationPipe } from '@nestjs/common';
import { AllExceptionsFilter } from './common/filters/http-exception.filter';

async function bootstrap() {
  const app = await NestFactory.create(AppModule);

  // CORS seguro - whitelist via variável de ambiente
  const allowedOrigins = process.env.CORS_ORIGIN
    ? process.env.CORS_ORIGIN.split(',').map(o => o.trim())
    : null;

  app.enableCors({
    origin: allowedOrigins
      ? (origin, callback) => {
        // Permitir requests sem origin (mobile apps, curl, etc)
        if (!origin || allowedOrigins.includes(origin)) {
          callback(null, true);
        } else {
          console.warn(`⛔ CORS bloqueado para origin: ${origin}`);
          callback(new Error('Não permitido pelo CORS'));
        }
      }
      : true, // Dev: aceita qualquer origin
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
