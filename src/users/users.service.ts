import { Injectable, NotFoundException, ConflictException, ForbiddenException } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository, In } from 'typeorm';
import { User, UserRole } from './user.entity';
import { Leader } from '../leaders/leader.entity';
import { CurrentUserData } from '../common/decorators/current-user.decorator';
import * as bcrypt from 'bcrypt';

// Hierarquia de criação de usuários:
// ADMIN -> pode criar qualquer tipo de usuário
// VEREADOR -> pode criar ASSESSOR e LIDERANCA (vinculados a si)
// ASSESSOR -> pode criar apenas LIDERANCA (vinculados ao seu vereador)
// LIDERANCA -> não pode criar usuários

const ALLOWED_ROLES_TO_CREATE: Record<UserRole, UserRole[]> = {
  [UserRole.ADMIN]: [UserRole.ADMIN, UserRole.VEREADOR, UserRole.ASSESSOR, UserRole.LIDERANCA],
  [UserRole.VEREADOR]: [UserRole.ASSESSOR, UserRole.LIDERANCA],
  [UserRole.ASSESSOR]: [UserRole.LIDERANCA],
  [UserRole.LIDERANCA]: [],
};

@Injectable()
export class UsersService {
  constructor(
    @InjectRepository(User)
    private usersRepository: Repository<User>,
    @InjectRepository(Leader)
    private leadersRepository: Repository<Leader>,
  ) { }

  async create(userData: Partial<User>, currentUser: CurrentUserData): Promise<User> {
    const creatorRole = currentUser.role as UserRole;
    const newUserRole = userData.role || UserRole.ASSESSOR;

    // Verifica se o criador pode criar o tipo de usuário solicitado
    const allowedRoles = ALLOWED_ROLES_TO_CREATE[creatorRole] || [];
    if (!allowedRoles.includes(newUserRole)) {
      throw new ForbiddenException(
        `Usuário com perfil ${creatorRole} não pode criar usuário com perfil ${newUserRole}`
      );
    }

    // Check if user already exists
    const whereConditions: any[] = [{ email: userData.email }];

    // Só verifica duplicidade de CPF se foi informado
    if (userData.cpf && userData.cpf.trim() !== '') {
      whereConditions.push({ cpf: userData.cpf });
    }

    const existingUser = await this.usersRepository.findOne({
      where: whereConditions,
    });

    if (existingUser) {
      // Mensagem mais específica
      if (existingUser.email === userData.email) {
        throw new ConflictException('Já existe um usuário com este email');
      }
      throw new ConflictException('Já existe um usuário com este CPF');
    }

    // Hash password
    if (userData.password) {
      userData.password = await bcrypt.hash(userData.password, 10);
    }

    // Define o vereadorId baseado em quem está criando
    if (creatorRole === UserRole.ADMIN) {
      // Admin pode especificar qualquer vereadorId ou deixar null
      // Se está criando um VEREADOR, vereadorId será definido após o save
      if (newUserRole !== UserRole.VEREADOR && newUserRole !== UserRole.ADMIN && !userData.vereadorId) {
        throw new ForbiddenException('Admin deve especificar um vereadorId ao criar assessor ou liderança');
      }
    } else if (creatorRole === UserRole.VEREADOR) {
      // Vereador: vincula ao próprio ID
      userData.vereadorId = currentUser.userId;
    } else if (creatorRole === UserRole.ASSESSOR) {
      // Assessor: vincula ao seu vereador
      userData.vereadorId = currentUser.vereadorId;
    }

    const user = this.usersRepository.create(userData);
    const savedUser = await this.usersRepository.save(user);

    // Se o usuário é VEREADOR, atualizar vereadorId para apontar para si mesmo
    if (savedUser.role === UserRole.VEREADOR && !savedUser.vereadorId) {
      savedUser.vereadorId = savedUser.id;
      await this.usersRepository.save(savedUser);
    }

    // Se o usuário é LIDERANCA, criar automaticamente um registro na tabela leaders
    if (savedUser.role === UserRole.LIDERANCA) {
      await this.createLeaderFromUser(savedUser);
    }

    return savedUser;
  }

  /**
   * Cria um registro de Leader a partir de um User com role LIDERANCA
   */
  private async createLeaderFromUser(user: User): Promise<Leader> {
    // Verifica se já existe um leader vinculado a este usuário
    const existingLeader = await this.leadersRepository.findOne({
      where: { userId: user.id }
    });

    if (existingLeader) {
      return existingLeader;
    }

    const leader = this.leadersRepository.create({
      name: user.name,
      cpf: user.cpf,
      phone: user.phone,
      email: user.email,
      region: user.region || 'Não definida',
      votersCount: 0,
      votersGoal: 100, // Meta padrão
      active: user.active,
      vereadorId: user.vereadorId,
      userId: user.id,
    });

    return await this.leadersRepository.save(leader);
  }

  async findAll(currentUser: CurrentUserData): Promise<any[]> {
    try {
      const creatorRole = currentUser.role as UserRole;
      let whereClause = {};

      // Filtra usuários baseado no perfil do usuário atual
      if (creatorRole === UserRole.VEREADOR) {
        // Vereador vê apenas seus assessores e lideranças
        whereClause = { vereadorId: currentUser.userId };
      } else if (creatorRole === UserRole.ASSESSOR) {
        // Assessor vê apenas lideranças do seu vereador
        whereClause = {
          vereadorId: currentUser.vereadorId,
          role: UserRole.LIDERANCA,
        };
      }
      // Admin vê todos (sem filtro)

      const users = await this.usersRepository.find({
        where: Object.keys(whereClause).length > 0 ? whereClause : undefined,
        relations: ['vereador'],
        order: { createdAt: 'DESC' },
      });

      return users.map(user => {
        const { password, vereador, ...userWithoutPassword } = user as any;
        return {
          ...userWithoutPassword,
          vereadorName: vereador?.name || null,
        };
      });
    } catch (error) {
      console.error('Error fetching users:', error);
      return [];
    }
  }

  async findOne(id: string, currentUser?: CurrentUserData): Promise<any> {
    const user = await this.usersRepository.findOne({
      where: { id },
      relations: ['vereador'],
    });
    if (!user) {
      throw new NotFoundException('Usuário não encontrado');
    }

    // Verifica permissão de acesso se currentUser foi fornecido
    if (currentUser) {
      const viewerRole = currentUser.role as UserRole;

      if (viewerRole === UserRole.VEREADOR) {
        // Vereador só pode ver usuários vinculados a si
        if (user.vereadorId !== currentUser.userId && user.id !== currentUser.userId) {
          throw new ForbiddenException('Acesso negado a este usuário');
        }
      } else if (viewerRole === UserRole.ASSESSOR) {
        // Assessor só pode ver lideranças do seu vereador ou a si mesmo
        if (user.id !== currentUser.userId &&
          (user.vereadorId !== currentUser.vereadorId || user.role !== UserRole.LIDERANCA)) {
          throw new ForbiddenException('Acesso negado a este usuário');
        }
      } else if (viewerRole === UserRole.LIDERANCA) {
        // Liderança só pode ver a si mesma
        if (user.id !== currentUser.userId) {
          throw new ForbiddenException('Acesso negado a este usuário');
        }
      }
    }

    const { password, vereador, ...userWithoutPassword } = user as any;
    return {
      ...userWithoutPassword,
      vereadorName: vereador?.name || null,
    };
  }

  async findByEmail(email: string): Promise<User | null> {
    return await this.usersRepository.findOne({ where: { email } });
  }

  async findByCpf(cpf: string): Promise<User | null> {
    return await this.usersRepository.findOne({ where: { cpf } });
  }

  async checkEmailExists(email: string): Promise<boolean> {
    const user = await this.usersRepository.findOne({ where: { email } });
    return !!user;
  }

  async checkCpfExists(cpf: string): Promise<boolean> {
    const user = await this.usersRepository.findOne({ where: { cpf } });
    return !!user;
  }

  async update(id: string, userData: Partial<User>, currentUser: CurrentUserData): Promise<User> {
    const user = await this.usersRepository.findOne({ where: { id } });
    if (!user) {
      throw new NotFoundException('Usuário não encontrado');
    }

    const editorRole = currentUser.role as UserRole;

    // Verifica permissão de edição
    if (editorRole === UserRole.VEREADOR) {
      // Vereador só pode editar seus assessores e lideranças
      if (user.vereadorId !== currentUser.userId) {
        throw new ForbiddenException('Acesso negado a este usuário');
      }
    } else if (editorRole === UserRole.ASSESSOR) {
      // Assessor só pode editar lideranças do seu vereador
      if (user.vereadorId !== currentUser.vereadorId || user.role !== UserRole.LIDERANCA) {
        throw new ForbiddenException('Assessor só pode editar lideranças');
      }
    }
    // Admin pode editar qualquer um

    // Não permite alterar role para um que o editor não pode criar
    if (userData.role) {
      const allowedRoles = ALLOWED_ROLES_TO_CREATE[editorRole] || [];
      if (!allowedRoles.includes(userData.role)) {
        throw new ForbiddenException(
          `Não é permitido alterar o perfil para ${userData.role}`
        );
      }
    }

    // If password is being updated, hash it
    if (userData.password) {
      userData.password = await bcrypt.hash(userData.password, 10);
    }

    // Remove vereadorId do update para não permitir alteração (exceto admin)
    if (editorRole !== UserRole.ADMIN) {
      delete (userData as any).vereadorId;
    }

    Object.assign(user, userData);
    const updatedUser = await this.usersRepository.save(user);

    // Se o usuário é LIDERANCA, sincroniza com a tabela leaders
    if (updatedUser.role === UserRole.LIDERANCA) {
      await this.syncLeaderWithUser(updatedUser);
    }

    return updatedUser;
  }

  /**
   * Sincroniza os dados do Leader com os dados do User
   */
  private async syncLeaderWithUser(user: User): Promise<void> {
    const leader = await this.leadersRepository.findOne({
      where: { userId: user.id }
    });

    if (leader) {
      // Atualiza os dados do leader com os dados do user
      leader.name = user.name;
      leader.cpf = user.cpf;
      leader.phone = user.phone;
      leader.email = user.email;
      leader.region = user.region || leader.region;
      leader.active = user.active;
      await this.leadersRepository.save(leader);
    } else {
      // Se não existe leader, cria um novo
      await this.createLeaderFromUser(user);
    }
  }

  async remove(id: string, currentUser: CurrentUserData): Promise<void> {
    const user = await this.usersRepository.findOne({ where: { id } });
    if (!user) {
      throw new NotFoundException('Usuário não encontrado');
    }

    const deleterRole = currentUser.role as UserRole;

    // Verifica permissão de exclusão
    if (deleterRole === UserRole.VEREADOR || deleterRole === UserRole.ASSESSOR) {
      // Vereador e Assessor só podem excluir usuários vinculados ao seu vereador
      const targetVereadorId = deleterRole === UserRole.VEREADOR ? currentUser.userId : currentUser.vereadorId;

      if (user.vereadorId !== targetVereadorId) {
        throw new ForbiddenException('Acesso negado a este usuário');
      }
      // Não pode excluir a si mesmo
      if (user.id === currentUser.userId) {
        throw new ForbiddenException('Não é possível excluir a si mesmo');
      }
      // Assessor só pode excluir lideranças
      if (deleterRole === UserRole.ASSESSOR && user.role !== UserRole.LIDERANCA) {
        throw new ForbiddenException('Assessor só pode excluir lideranças');
      }
    }
    // Admin pode excluir qualquer um (exceto verificação adicional se necessário)

    // Se o usuário é LIDERANCA, remove também o registro da tabela leaders
    if (user.role === UserRole.LIDERANCA) {
      const leader = await this.leadersRepository.findOne({
        where: { userId: user.id }
      });
      if (leader) {
        await this.leadersRepository.remove(leader);
      }
    }

    await this.usersRepository.remove(user);
  }

  async validatePassword(user: User, password: string): Promise<boolean> {
    const isMatch = await bcrypt.compare(password, user.password);
    console.log(`[UsersService] Validating password for user ${user.id}`);
    console.log(`[UsersService] Input password: ${password}`); // BE CAREFUL WITH THIS IN PROD
    console.log(`[UsersService] Stored hash: ${user.password}`);
    console.log(`[UsersService] Match result: ${isMatch}`);
    return isMatch;
  }
}
