
import { NestFactory } from '@nestjs/core';
import { AppModule } from '../app.module';
import { UsersService } from '../users/users.service';
import { User, UserRole } from '../users/user.entity';
import { Repository } from 'typeorm';
import { getRepositoryToken } from '@nestjs/typeorm';
import { Leader } from '../leaders/leader.entity';
import { Voter } from '../voters/voter.entity';

async function bootstrap() {
    const app = await NestFactory.createApplicationContext(AppModule);

    try {
        const usersRepository = app.get<Repository<User>>(getRepositoryToken(User));
        const leadersRepository = app.get<Repository<Leader>>(getRepositoryToken(Leader));
        const votersRepository = app.get<Repository<Voter>>(getRepositoryToken(Voter));

        console.log('🔄 Iniciando migração COMPLETA para Vereador Francisco...');

        // 1. Encontrar o vereador Francisco via banco (para garantir ID correto)
        const allVereadores = await usersRepository.find({ where: { role: UserRole.VEREADOR } });
        const targetVereador = allVereadores.find(v => v.name.toLowerCase().includes('francisco'));

        if (!targetVereador) {
            console.error('❌ Vereador "Francisco" não encontrado!');
            console.log('Vereadores disponíveis:', allVereadores.map(v => v.name).join(', '));
            return;
        }

        console.log(`✅ Vereador alvo encontrado: ${targetVereador.name} (${targetVereador.id})`);

        // 2. Buscar todas as lideranças
        const allLeaders = await usersRepository.find({ where: { role: UserRole.LIDERANCA } });
        console.log(`📊 Total de lideranças encontradas: ${allLeaders.length}`);

        let leadersMigrated = 0;

        for (const leaderUser of allLeaders) {
            // Mesmo se já for do Francisco, verificamos se o Leader entity está sincronizado
            // Mas o foco principal é mover quem NÃO é
            if (leaderUser.vereadorId !== targetVereador.id) {
                console.log(`Migrando Liderança: ${leaderUser.name}...`);
                leaderUser.vereadorId = targetVereador.id;
                await usersRepository.save(leaderUser);
                leadersMigrated++;
            }

            // Atualizar Entity Leader
            const leaderEntity = await leadersRepository.findOne({ where: { userId: leaderUser.id } });
            if (leaderEntity && leaderEntity.vereadorId !== targetVereador.id) {
                leaderEntity.vereadorId = targetVereador.id;
                await leadersRepository.save(leaderEntity);
            }
        }

        // 3. Migrar TODOS os eleitores (mesmo os sem liderança ou de outros vereadores)
        // Usando QueryBuilder para ser eficiente e garantir que pegue TODOS
        console.log('\n🔄 Migrando TODOS os eleitores da base para Francisco...');

        const result = await votersRepository.createQueryBuilder()
            .update(Voter)
            .set({ vereadorId: targetVereador.id })
            .where("vereadorId != :id OR vereadorId IS NULL", { id: targetVereador.id })
            .execute();

        const votersMigrated = result.affected || 0;

        console.log('\n==========================================');
        console.log('🚀 MIGRAÇÃO CONCLUÍDA COM SUCESSO');
        console.log('==========================================');
        console.log(`👤 Vereador Destino: ${targetVereador.name}`);
        console.log(`👥 Lideranças migradas ou verificadas: ${leadersMigrated}`);
        console.log(`🗳️ Total de eleitores migrados (incluindo órfãos): ${votersMigrated}`);
        console.log('==========================================\n');

    } catch (error) {
        console.error('❌ Erro durante a migração:', error);
    } finally {
        await app.close();
    }
}

bootstrap();
