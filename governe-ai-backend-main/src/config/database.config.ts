import { TypeOrmModuleOptions } from '@nestjs/typeorm';

export const getDatabaseConfig = (): TypeOrmModuleOptions => {
  // SSL só ativa se DATABASE_SSL === 'true'
  const sslConfig = process.env.DATABASE_SSL === 'true'
    ? { rejectUnauthorized: false }
    : false;

  // Se DATABASE_URL estiver definida, usar ela
  if (process.env.DATABASE_URL) {
    return {
      type: 'postgres',
      url: process.env.DATABASE_URL,
      entities: [__dirname + '/../**/*.entity{.ts,.js}'],
      synchronize: true,
      logging: process.env.NODE_ENV === 'development',
      ssl: sslConfig,
    };
  }

  // Fallback para variáveis individuais
  const config: TypeOrmModuleOptions = {
    type: 'postgres',
    host: process.env.DATABASE_HOST || '144.126.137.156',
    port: parseInt(process.env.DATABASE_PORT || '5437'),
    username: process.env.DATABASE_USER || 'postgres',
    password: process.env.DATABASE_PASSWORD || 'T1fpOr8Kw7KQEpU781gm9NWy7#',
    database: process.env.DATABASE_NAME || 'admin',
    entities: [__dirname + '/../**/*.entity{.ts,.js}'],
    synchronize: true,
    logging: process.env.NODE_ENV === 'development',
    ssl: sslConfig,
  };

  return config;
};
