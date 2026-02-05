import { NestFactory } from '@nestjs/core';
import { AppModule } from '../app.module';
import { UsersService } from '../users/users.service';
import { UserRole } from '../users/user.entity';

async function bootstrap() {
  const app = await NestFactory.createApplicationContext(AppModule);
  const usersService = app.get(UsersService);

  const adminEmail = 'admin@governeai.com';
  const adminPassword = 'admin123';

  try {
    // Verifica se já existe
    const existingUser = await usersService.findByEmail(adminEmail);
    if (existingUser) {
      console.log('⚠️  Usuário admin já existe:', adminEmail);
      await app.close();
      return;
    }

    // Cria o usuário admin (usando um usuário de sistema como criador)
    const systemUser = {
      userId: 'system',
      email: 'system@governeai.com',
      role: UserRole.ADMIN as string,
      name: 'System',
      vereadorId: null,
    };
    const admin = await usersService.create({
      name: 'Administrador',
      email: adminEmail,
      password: adminPassword,
      cpf: '00000000000',
      phone: '00000000000',
      role: UserRole.ADMIN,
      active: true,
    }, systemUser);

    console.log('✅ Usuário admin criado com sucesso!');
    console.log('📧 Email:', adminEmail);
    console.log('🔑 Senha:', adminPassword);
    console.log('👤 ID:', admin.id);
  } catch (error) {
    console.error('❌ Erro ao criar admin:', error.message);
  }

  await app.close();
}

bootstrap();
