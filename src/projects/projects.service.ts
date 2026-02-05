import { Injectable, NotFoundException, ForbiddenException, BadRequestException } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { LawProject } from './project.entity';
import { CurrentUserData } from '../common/decorators/current-user.decorator';
import { UserRole } from '../users/user.entity';

@Injectable()
export class ProjectsService {
  constructor(
    @InjectRepository(LawProject)
    private projectsRepository: Repository<LawProject>,
  ) {}

  async create(projectData: Partial<LawProject>, currentUser: CurrentUserData): Promise<LawProject> {
    let vereadorId: string;

    if (currentUser.role === UserRole.ADMIN) {
      // Admin DEVE especificar o vereadorId
      if (!projectData.vereadorId) {
        throw new BadRequestException('Admin deve especificar o vereadorId ao criar um projeto');
      }
      vereadorId = projectData.vereadorId;
    } else {
      // Vereador/Assessor usa seu próprio vereadorId
      vereadorId = currentUser.vereadorId;
    }

    const project = this.projectsRepository.create({
      ...projectData,
      vereadorId,
    });
    return await this.projectsRepository.save(project);
  }

  async findAll(vereadorId: string | null): Promise<LawProject[]> {
    if (!vereadorId) {
      // Admin: retorna todos os projetos
      return await this.projectsRepository.find({
        order: { createdAt: 'DESC' },
      });
    }

    // Usuário comum: retorna apenas projetos do seu vereador
    return await this.projectsRepository.find({
      where: { vereadorId },
      order: { createdAt: 'DESC' },
    });
  }

  async findOne(id: string, vereadorId: string | null): Promise<LawProject> {
    const project = await this.projectsRepository.findOne({ where: { id } });
    if (!project) {
      throw new NotFoundException('Projeto não encontrado');
    }

    // Verifica se o usuário tem acesso a este registro
    if (vereadorId && project.vereadorId !== vereadorId) {
      throw new ForbiddenException('Acesso negado a este projeto');
    }

    return project;
  }

  async update(id: string, projectData: Partial<LawProject>, vereadorId: string | null): Promise<LawProject> {
    const project = await this.findOne(id, vereadorId);

    // Remove vereadorId do update para não permitir alteração
    const { vereadorId: _, ...dataToUpdate } = projectData as any;
    Object.assign(project, dataToUpdate);

    return await this.projectsRepository.save(project);
  }

  async remove(id: string, vereadorId: string | null): Promise<void> {
    const project = await this.findOne(id, vereadorId);
    await this.projectsRepository.remove(project);
  }

  async incrementViews(id: string, vereadorId: string | null): Promise<LawProject> {
    const project = await this.findOne(id, vereadorId);
    project.views += 1;
    return await this.projectsRepository.save(project);
  }
}
