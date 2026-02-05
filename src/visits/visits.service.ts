import { Injectable, NotFoundException, ForbiddenException, BadRequestException } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { Visit } from './visit.entity';
import { Voter } from '../voters/voter.entity';
import { Leader } from '../leaders/leader.entity';
import { User, UserRole } from '../users/user.entity';
import { CreateVisitDto } from './dto/create-visit.dto';
import { CurrentUserData } from '../common/decorators/current-user.decorator';

@Injectable()
export class VisitsService {
  constructor(
    @InjectRepository(Visit)
    private visitsRepository: Repository<Visit>,
    @InjectRepository(Voter)
    private votersRepository: Repository<Voter>,
    @InjectRepository(Leader)
    private leadersRepository: Repository<Leader>,
    @InjectRepository(User)
    private usersRepository: Repository<User>,
  ) {}

  async create(visitData: CreateVisitDto & { vereadorId?: string }, currentUser: CurrentUserData): Promise<any> {
    let vereadorId: string;

    if (currentUser.role === UserRole.ADMIN) {
      // Admin DEVE especificar o vereadorId
      if (!visitData.vereadorId) {
        throw new BadRequestException('Admin deve especificar o vereadorId ao criar uma visita');
      }
      vereadorId = visitData.vereadorId;
    } else {
      // Vereador/Assessor/Liderança usa seu próprio vereadorId
      vereadorId = currentUser.vereadorId;
    }
    // Validar se o eleitor existe
    if (visitData.voterId) {
      const voter = await this.votersRepository.findOne({ where: { id: visitData.voterId } });
      if (!voter) {
        throw new NotFoundException('Eleitor não encontrado. Por favor, atualize a lista de eleitores e tente novamente.');
      }
    }

    // Validar e buscar liderança
    let leaderId = visitData.leaderId;
    let leader = null;

    console.log('Creating visit. Initial data:', {
      leaderId,
      userId: visitData.userId,
      voterId: visitData.voterId,
      vereadorId
    });

    // Se leaderId foi fornecido, verificar se existe
    if (leaderId) {
      leader = await this.leadersRepository.findOne({ where: { id: leaderId } });
      console.log('Search by leaderId result:', leader ? 'Found' : 'Not Found');
    }

    // Se leaderId não foi encontrado e userId foi fornecido, tentar buscar liderança pelo email ou CPF do usuário
    if (!leader && visitData.userId) {
      const user = await this.usersRepository.findOne({ where: { id: visitData.userId } });

      if (user) {
        console.log('User found for matching:', {
          id: user.id,
          email: user.email,
          cpf: user.cpf
        });

        // Tentar encontrar liderança pelo email ou CPF
        // Normalizar CPF para comparação (apenas números)
        const cpfNumbers = user.cpf ? user.cpf.replace(/\D/g, '') : null;

        const whereConditions: any[] = [{ email: user.email }];

        if (user.cpf) {
            whereConditions.push({ cpf: user.cpf }); // CPF como está salvo
            if (cpfNumbers && cpfNumbers !== user.cpf) {
                whereConditions.push({ cpf: cpfNumbers }); // CPF apenas números
            }
        }

        leader = await this.leadersRepository.findOne({
          where: whereConditions
        });

        console.log('Search leader by User Email/CPF result:', leader ? `Found (ID: ${leader.id})` : 'Not Found');

        if (leader) {
          leaderId = leader.id;
        } else if (user.role === 'vereador' || user.role === 'admin' || (user.role as string) === 'candidato') {
           // SE O USUÁRIO TEM PERFIL PRIVILEGIADO E NÃO É LÍDER, CRIAR UM REGISTRO DE LÍDER AUTOMATICAMENTE
           console.log('Creating automatic leader record for privileged user:', user.email);
           try {
             const newLeader = this.leadersRepository.create({
               name: user.name,
               email: user.email,
               cpf: user.cpf,
               phone: user.phone,
               region: user.region || 'Geral',
               active: true,
               vereadorId: vereadorId,
             });
             const savedLeader = await this.leadersRepository.save(newLeader);
             leader = savedLeader;
             leaderId = savedLeader.id;
             console.log('Automatic leader created successfully:', savedLeader.id);
           } catch (error) {
             console.error('Error creating automatic leader:', error);
             // Não vamos falhar aqui, deixamos o erro original de "liderança não encontrada" ser lançado
           }
        }
      } else {
        console.log('User not found for userId:', visitData.userId);
      }
    }

    // FALLBACK: Se ainda não temos uma liderança identificada, usar a liderança do próprio eleitor
    if (!leader && visitData.voterId) {
       try {
         const voter = await this.votersRepository.findOne({ where: { id: visitData.voterId } });
         if (voter && voter.leaderId) {
           console.log(`Using voter's leader as fallback. Voter ID: ${voter.id}, Leader ID: ${voter.leaderId}`);
           const voterLeader = await this.leadersRepository.findOne({ where: { id: voter.leaderId } });
           if (voterLeader) {
              leader = voterLeader;
              leaderId = voterLeader.id;
           }
         }
       } catch (err) {
         console.error('Error fetching voter leader fallback:', err);
       }
    }

    // ÚLTIMO RECURSO: Criar um líder para o usuário atual se ele tiver dados mínimos, para não travar o app
    if (!leader && visitData.userId) {
        try {
            const user = await this.usersRepository.findOne({ where: { id: visitData.userId } });
            if (user) {
                 console.log('Creating emergency leader for user to prevent error:', user.email);
                 // Verificar novamente se já existe para evitar duplicação (caso o erro anterior tenha sido sutil)
                 let existingLeader = await this.leadersRepository.findOne({
                    where: [{ email: user.email }, { cpf: user.cpf }]
                 });

                 if (existingLeader) {
                    leader = existingLeader;
                    leaderId = existingLeader.id;
                 } else {
                     const newLeader = this.leadersRepository.create({
                       name: user.name,
                       email: user.email,
                       cpf: user.cpf,
                       phone: user.phone || '00000000000',
                       region: user.region || 'Geral',
                       active: true,
                       votersCount: 0,
                       votersGoal: 0,
                       vereadorId: vereadorId,
                     });
                     leader = await this.leadersRepository.save(newLeader);
                     leaderId = leader.id;
                 }
            }
        } catch (err) {
            console.error('Critical error creating emergency leader:', err);
        }
    }

    // Validar se a liderança existe - AGORA OPCIONAL
    if (!leader) {
      console.warn('Visit created without a leader. No leader found for the provided context.');
      // Não lançamos mais erro aqui para permitir a criação sem liderança
      // throw new NotFoundException('Liderança não encontrada...');
    }

    // Garantir que o leaderId está definido no visitData (pode ser null agora)
    visitData.leaderId = leaderId || null;

    const visit = this.visitsRepository.create({
      ...visitData,
      vereadorId,
    });
    const saved = await this.visitsRepository.save(visit);
    return this.findOne(saved.id, vereadorId);
  }

  async findAll(vereadorId: string | null): Promise<any[]> {
    const whereCondition = vereadorId ? { vereadorId } : {};

    const visits = await this.visitsRepository.find({
      where: whereCondition,
      relations: ['voter', 'leader'],
      order: { date: 'DESC' },
    });

    return visits.map(v => this.formatVisit(v));
  }

  async findOne(id: string, vereadorId: string | null): Promise<any> {
    const visit = await this.visitsRepository.findOne({
      where: { id },
      relations: ['voter', 'leader'],
    });

    if (!visit) {
      throw new NotFoundException('Visita não encontrada');
    }

    // Verifica se o usuário tem acesso a este registro
    if (vereadorId && visit.vereadorId !== vereadorId) {
      throw new ForbiddenException('Acesso negado a esta visita');
    }

    return this.formatVisit(visit);
  }

  async update(id: string, visitData: Partial<Visit>, vereadorId: string | null): Promise<any> {
    const visit = await this.visitsRepository.findOne({ where: { id } });

    if (!visit) {
      throw new NotFoundException('Visita não encontrada');
    }

    // Verifica se o usuário tem acesso a este registro
    if (vereadorId && visit.vereadorId !== vereadorId) {
      throw new ForbiddenException('Acesso negado a esta visita');
    }

    // Remove vereadorId do update para não permitir alteração
    const { vereadorId: _, ...dataToUpdate } = visitData as any;
    Object.assign(visit, dataToUpdate);
    await this.visitsRepository.save(visit);

    return this.findOne(id, vereadorId);
  }

  async remove(id: string, vereadorId: string | null): Promise<void> {
    const visit = await this.visitsRepository.findOne({ where: { id } });

    if (!visit) {
      throw new NotFoundException('Visita não encontrada');
    }

    // Verifica se o usuário tem acesso a este registro
    if (vereadorId && visit.vereadorId !== vereadorId) {
      throw new ForbiddenException('Acesso negado a esta visita');
    }

    await this.visitsRepository.remove(visit);
  }

  private formatVisit(visit: Visit): any {
    return {
      ...visit,
      voterName: visit.voter?.name || '',
      leaderName: visit.leader?.name || '',
      location: visit.latitude && visit.longitude
        ? { latitude: Number(visit.latitude), longitude: Number(visit.longitude) }
        : undefined,
    };
  }
}
