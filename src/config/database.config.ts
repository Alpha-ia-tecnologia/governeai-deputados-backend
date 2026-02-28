import { TypeOrmModuleOptions } from '@nestjs/typeorm';

export const getDatabaseConfig = (): TypeOrmModuleOptions => {
  // Se DATABASE_URL estiver definida via env, usar ela (deploy override)
  if (process.env.DATABASE_URL) {
    return {
      type: 'postgres',
      url: process.env.DATABASE_URL,
      entities: [__dirname + '/../**/*.entity{.ts,.js}'],
      synchronize: true,
      logging: process.env.NODE_ENV === 'development',
      ssl: process.env.DATABASE_SSL === 'true'
        ? { rejectUnauthorized: false }
        : false,
    };
  }

  // Credenciais do banco governe-deputado
  // Interno (deploy): governe-ai-deputado_bd-deputado:5432
  // Externo (dev local): 144.126.137.156:5433
  return {
    type: 'postgres',
    host: process.env.DATABASE_HOST || '144.126.137.156',
    port: parseInt(process.env.DATABASE_PORT || '5433'),
    username: process.env.DATABASE_USER || 'postgres',
    password: process.env.DATABASE_PASSWORD || 'T1fpOr8Kw7KQEpU781gm9NWy7',
    database: process.env.DATABASE_NAME || 'governe-deputado',
    entities: [__dirname + '/../**/*.entity{.ts,.js}'],
    synchronize: true,
    logging: process.env.NODE_ENV === 'development',
    ssl: false,
  };
};
