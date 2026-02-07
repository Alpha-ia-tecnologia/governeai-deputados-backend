
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

        console.log('🔄 Iniciando migração para Vereador Francisco...');

        // 1. Encontrar o vereador Francisco
        const francisco = await usersRepository.findOne({
            where: {
                role: UserRole.VEREADOR,
                // Busca case insensitive (aproximada) ou pegar o primeiro vereador se não achar
                // Como o usuário disse "Francisco", vamos tentar achar por nome
            }
        });

        // Buscar todos os vereadores para filtrar manualmente (TypeOrm ILIKE as vezes varia com o driver)
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

        let votersMigrated = 0;
        let leadersMigrated = 0;

        for (const leaderUser of allLeaders) {
            // Pular se já é do Francisco
            if (leaderUser.vereadorId === targetVereador.id) {
                continue;
            }

            console.log(`Migrando Liderança: ${leaderUser.name}...`);

            // Atualizar User Lideranca
            leaderUser.vereadorId = targetVereador.id;
            await usersRepository.save(leaderUser);

            // Atualizar Entity Leader
            const leaderEntity = await leadersRepository.findOne({ where: { userId: leaderUser.id } });
            if (leaderEntity) {
                leaderEntity.vereadorId = targetVereador.id;
                await leadersRepository.save(leaderEntity);

                // Atualizar Eleitores deste Leader
                const votersUpdateResult = await votersRepository.update(
                    { leaderId: leaderEntity.id },
                    { vereadorId: targetVereador.id }
                );

                const count = votersUpdateResult.affected || 0;
                votersMigrated += count;
                leadersMigrated++;

                console.log(`  -> Migrada para Francisco. ${count} eleitores atualizados.`);
            }
        }

        console.log('\n==========================================');
        console.log('🚀 MIGRAÇÃO CONCLUÍDA COM SUCESSO');
        console.log('==========================================');
        console.log(`👤 Vereador Destino: ${targetVereador.name}`);
        console.log(`👥 Lideranças migradas: ${leadersMigrated}`);
        console.log(`🗳️ Eleitores migrados: ${votersMigrated}`);
        console.log('==========================================\n');

    } catch (error) {
        console.error('❌ Erro durante a migração:', error);
    } finally {
        await app.close();
    }
}

bootstrap();
