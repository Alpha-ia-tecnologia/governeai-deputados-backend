import { Injectable, NotFoundException, ForbiddenException, BadRequestException, Logger } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { Voter } from './voter.entity';
import { Leader } from '../leaders/leader.entity';
import { HelpRecord } from '../help-records/help-record.entity';
import { User } from '../users/user.entity';
import { CurrentUserData } from '../common/decorators/current-user.decorator';
import { UserRole } from '../users/user.entity';
import { GeocodingService } from '../common/services/geocoding.service';

@Injectable()
export class VotersService {
  private readonly logger = new Logger(VotersService.name);

  constructor(
    @InjectRepository(Voter)
    private votersRepository: Repository<Voter>,
    @InjectRepository(Leader)
    private leadersRepository: Repository<Leader>,
    @InjectRepository(HelpRecord)
    private helpRecordsRepository: Repository<HelpRecord>,
    @InjectRepository(User)
    private usersRepository: Repository<User>,
    private geocodingService: GeocodingService,
  ) {}

  async create(voterData: Partial<Voter>, currentUser: CurrentUserData): Promise<Voter> {
    try {
      this.logger.log('Creating voter with data:', voterData);

      let vereadorId: string;

      if (currentUser.role === UserRole.ADMIN) {
        // Admin DEVE especificar o vereadorId
        if (!voterData.vereadorId) {
          throw new BadRequestException('Admin deve especificar o vereadorId ao criar um eleitor');
        }
        vereadorId = voterData.vereadorId;
      } else {
        // Vereador/Assessor/Liderança usa seu próprio vereadorId
        vereadorId = currentUser.vereadorId;
      }

      // Geocodificar endereço se os campos necessários estiverem presentes
      let latitude = voterData.latitude;
      let longitude = voterData.longitude;

      if (!latitude && !longitude && voterData.city && voterData.neighborhood) {
        this.logger.log('Tentando geocodificar endereço...');
        const geoResult = await this.geocodingService.geocodeAddress(
          voterData.street || '',
          voterData.number || '',
          voterData.neighborhood,
          voterData.city,
          voterData.state || '',
          voterData.cep,
        );

        if (geoResult) {
          latitude = geoResult.latitude;
          longitude = geoResult.longitude;
          this.logger.log(`Geocodificação bem-sucedida: (${latitude}, ${longitude})`);
        }
      }

      const voter = this.votersRepository.create({
        ...voterData,
        latitude,
        longitude,
        vereadorId,
      });
      const savedVoter = await this.votersRepository.save(voter);

      this.logger.log('Voter created successfully:', savedVoter.id);

      // Update leader's voter count if applicable
      if (savedVoter.leaderId) {
        await this.updateLeaderCount(savedVoter.leaderId);
      }

      // Return with leader info
      return this.findOne(savedVoter.id, vereadorId);
    } catch (error) {
      this.logger.error('Error creating voter:', error);
      throw error;
    }
  }

  async findAll(vereadorId: string | null): Promise<any[]> {
    try {
      this.logger.log('Finding all voters...');

      // Buscar eleitores com suas lideranças
      const queryBuilder = this.votersRepository
        .createQueryBuilder('voter')
        .leftJoinAndSelect('voter.leader', 'leader');

      // Se vereadorId não é null, filtra pelo vereador
      if (vereadorId) {
        queryBuilder.where('voter.vereadorId = :vereadorId', { vereadorId });
      }

      const voters = await queryBuilder
        .orderBy('voter.createdAt', 'DESC')
        .getMany();

      this.logger.log(`Found ${voters.length} voters in database`);

      // Formatar dados para o frontend
      const formattedVoters = voters.map(voter => {
        const formatted = {
          id: voter.id,
          name: voter.name || '',
          cpf: voter.cpf || '',
          voterRegistration: voter.voterRegistration || '',
          birthDate: voter.birthDate ? this.formatDate(voter.birthDate) : '',
          phone: voter.phone || '',
          // Campos de endereço
          street: voter.street || '',
          number: voter.number || '',
          complement: voter.complement || '',
          neighborhood: voter.neighborhood || '',
          cep: voter.cep || '',
          city: voter.city || '',
          state: voter.state || '',
          latitude: voter.latitude ? Number(voter.latitude) : null,
          longitude: voter.longitude ? Number(voter.longitude) : null,
          votesCount: voter.votesCount || 0,
          leaderId: voter.leaderId || '',
          leaderName: voter.leader?.name || '',
          notes: voter.notes || '',
          createdAt: voter.createdAt ? voter.createdAt.toISOString() : new Date().toISOString(),
          updatedAt: voter.updatedAt ? voter.updatedAt.toISOString() : new Date().toISOString(),
        };

        return formatted;
      });

      this.logger.log('Returning formatted voters');
      return formattedVoters;
    } catch (error) {
      this.logger.error('Error finding all voters:', error);
      // Retornar array vazio em caso de erro para não quebrar o frontend
      return [];
    }
  }

  async findOne(id: string, vereadorId: string | null): Promise<any> {
    try {
      this.logger.log(`Finding voter with id: ${id}`);

      const voter = await this.votersRepository
        .createQueryBuilder('voter')
        .leftJoinAndSelect('voter.leader', 'leader')
        .where('voter.id = :id', { id })
        .getOne();

      if (!voter) {
        throw new NotFoundException('Eleitor não encontrado');
      }

      // Verifica se o usuário tem acesso a este registro
      if (vereadorId && voter.vereadorId !== vereadorId) {
        throw new ForbiddenException('Acesso negado a este eleitor');
      }

      return {
        id: voter.id,
        name: voter.name || '',
        cpf: voter.cpf || '',
        voterRegistration: voter.voterRegistration || '',
        birthDate: voter.birthDate ? this.formatDate(voter.birthDate) : '',
        phone: voter.phone || '',
        // Campos de endereço
        street: voter.street || '',
        number: voter.number || '',
        complement: voter.complement || '',
        neighborhood: voter.neighborhood || '',
        cep: voter.cep || '',
        city: voter.city || '',
        state: voter.state || '',
        latitude: voter.latitude ? Number(voter.latitude) : null,
        longitude: voter.longitude ? Number(voter.longitude) : null,
        votesCount: voter.votesCount || 0,
        leaderId: voter.leaderId || '',
        leaderName: voter.leader?.name || '',
        notes: voter.notes || '',
        createdAt: voter.createdAt ? voter.createdAt.toISOString() : new Date().toISOString(),
        updatedAt: voter.updatedAt ? voter.updatedAt.toISOString() : new Date().toISOString(),
      };
    } catch (error) {
      this.logger.error(`Error finding voter ${id}:`, error);
      throw error;
    }
  }

  async update(id: string, voterData: Partial<Voter>, vereadorId: string | null): Promise<Voter> {
    try {
      this.logger.log(`Updating voter ${id}`);

      const voter = await this.votersRepository.findOne({ where: { id } });

      if (!voter) {
        throw new NotFoundException('Eleitor não encontrado');
      }

      // Verifica se o usuário tem acesso a este registro
      if (vereadorId && voter.vereadorId !== vereadorId) {
        throw new ForbiddenException('Acesso negado a este eleitor');
      }

      const oldLeaderId = voter.leaderId;
      // Remove vereadorId do update para não permitir alteração
      const { vereadorId: _, ...dataToUpdate } = voterData as any;

      // Verificar se precisa re-geocodificar (endereço mudou)
      const addressChanged =
        (dataToUpdate.street && dataToUpdate.street !== voter.street) ||
        (dataToUpdate.number && dataToUpdate.number !== voter.number) ||
        (dataToUpdate.neighborhood && dataToUpdate.neighborhood !== voter.neighborhood) ||
        (dataToUpdate.city && dataToUpdate.city !== voter.city) ||
        (dataToUpdate.cep && dataToUpdate.cep !== voter.cep);

      if (addressChanged && !dataToUpdate.latitude && !dataToUpdate.longitude) {
        const street = dataToUpdate.street || voter.street;
        const number = dataToUpdate.number || voter.number;
        const neighborhood = dataToUpdate.neighborhood || voter.neighborhood;
        const city = dataToUpdate.city || voter.city;
        const state = dataToUpdate.state || voter.state;
        const cep = dataToUpdate.cep || voter.cep;

        if (city && neighborhood) {
          this.logger.log('Endereço alterado, re-geocodificando...');
          const geoResult = await this.geocodingService.geocodeAddress(
            street || '',
            number || '',
            neighborhood,
            city,
            state || '',
            cep,
          );

          if (geoResult) {
            dataToUpdate.latitude = geoResult.latitude;
            dataToUpdate.longitude = geoResult.longitude;
            this.logger.log(`Re-geocodificação bem-sucedida: (${geoResult.latitude}, ${geoResult.longitude})`);
          }
        }
      }

      Object.assign(voter, dataToUpdate);
      const updatedVoter = await this.votersRepository.save(voter);

      // Update leader counts if leader changed
      if (oldLeaderId !== updatedVoter.leaderId) {
        if (oldLeaderId) {
          await this.updateLeaderCount(oldLeaderId);
        }
        if (updatedVoter.leaderId) {
          await this.updateLeaderCount(updatedVoter.leaderId);
        }
      }

      return this.findOne(updatedVoter.id, vereadorId);
    } catch (error) {
      this.logger.error(`Error updating voter ${id}:`, error);
      throw error;
    }
  }

  async remove(id: string, vereadorId: string | null): Promise<void> {
    try {
      this.logger.log(`Removing voter ${id}`);

      const voter = await this.votersRepository.findOne({ where: { id } });

      if (!voter) {
        throw new NotFoundException('Eleitor não encontrado');
      }

      // Verifica se o usuário tem acesso a este registro
      if (vereadorId && voter.vereadorId !== vereadorId) {
        throw new ForbiddenException('Acesso negado a este eleitor');
      }

      // Remover registros de ajuda vinculados antes de remover o eleitor
      await this.helpRecordsRepository.delete({ voterId: id });

      const leaderId = voter.leaderId;
      await this.votersRepository.remove(voter);

      // Update leader's voter count
      if (leaderId) {
        await this.updateLeaderCount(leaderId);
      }

      this.logger.log(`Voter ${id} removed successfully`);
    } catch (error) {
      this.logger.error(`Error removing voter ${id}:`, error);
      throw error;
    }
  }

  private async updateLeaderCount(leaderId: string): Promise<void> {
    try {
      const count = await this.votersRepository.count({ where: { leaderId } });
      await this.leadersRepository.update(leaderId, { votersCount: count });
      this.logger.log(`Updated leader ${leaderId} voter count to ${count}`);
    } catch (error) {
      this.logger.error(`Error updating leader count for ${leaderId}:`, error);
    }
  }

  private formatDate(date: Date | string): string {
    try {
      const d = typeof date === 'string' ? new Date(date) : date;
      const year = d.getFullYear();
      const month = String(d.getMonth() + 1).padStart(2, '0');
      const day = String(d.getDate()).padStart(2, '0');
      return `${year}-${month}-${day}`;
    } catch {
      return '';
    }
  }

  // ============================================
  // MÉTODOS PARA MAPA DE CALOR
  // ============================================

  async getHeatmapData(vereadorId: string): Promise<{
    points: Array<{ latitude: number; longitude: number; weight: number }>;
    center: { latitude: number; longitude: number } | null;
    totalVoters: number;
    votersWithLocation: number;
  }> {
    try {
      this.logger.log(`Buscando dados de heatmap para vereador: ${vereadorId}`);

      // Buscar todos os eleitores do vereador que têm coordenadas
      const voters = await this.votersRepository
        .createQueryBuilder('voter')
        .select(['voter.latitude', 'voter.longitude'])
        .where('voter.vereadorId = :vereadorId', { vereadorId })
        .getMany();

      const totalVoters = voters.length;

      // Filtrar apenas eleitores com coordenadas válidas
      const votersWithLocation = voters.filter(
        v => v.latitude !== null && v.longitude !== null
      );

      // Gerar pontos para o mapa de calor
      const points = votersWithLocation.map(v => ({
        latitude: Number(v.latitude),
        longitude: Number(v.longitude),
        weight: 1,
      }));

      // Buscar centro do mapa (cidade do vereador)
      let center: { latitude: number; longitude: number } | null = null;

      const vereador = await this.usersRepository.findOne({
        where: { id: vereadorId },
        select: ['city', 'state'],
      });

      if (vereador?.city) {
        const cityCoords = await this.geocodingService.geocodeCity(
          vereador.city,
          vereador.state || '',
        );
        if (cityCoords) {
          center = {
            latitude: cityCoords.latitude,
            longitude: cityCoords.longitude,
          };
        }
      }

      // Se não tiver cidade configurada mas tiver eleitores, usa média das coordenadas
      if (!center && points.length > 0) {
        const avgLat = points.reduce((sum, p) => sum + p.latitude, 0) / points.length;
        const avgLng = points.reduce((sum, p) => sum + p.longitude, 0) / points.length;
        center = { latitude: avgLat, longitude: avgLng };
      }

      this.logger.log(`Heatmap: ${points.length} pontos de ${totalVoters} eleitores`);

      return {
        points,
        center,
        totalVoters,
        votersWithLocation: votersWithLocation.length,
      };
    } catch (error) {
      this.logger.error('Erro ao buscar dados de heatmap:', error);
      throw error;
    }
  }

  async getStatsByNeighborhood(vereadorId: string): Promise<{
    neighborhoods: Array<{
      name: string;
      count: number;
      percentage: number;
      latitude: number | null;
      longitude: number | null;
    }>;
    total: number;
  }> {
    try {
      this.logger.log(`Buscando estatísticas por bairro para vereador: ${vereadorId}`);

      // Buscar contagem por bairro
      const stats = await this.votersRepository
        .createQueryBuilder('voter')
        .select('voter.neighborhood', 'neighborhood')
        .addSelect('COUNT(*)', 'count')
        .addSelect('AVG(voter.latitude)', 'avgLatitude')
        .addSelect('AVG(voter.longitude)', 'avgLongitude')
        .where('voter.vereadorId = :vereadorId', { vereadorId })
        .andWhere('voter.neighborhood IS NOT NULL')
        .andWhere("voter.neighborhood != ''")
        .groupBy('voter.neighborhood')
        .orderBy('count', 'DESC')
        .getRawMany();

      // Calcular total para porcentagens
      const total = stats.reduce((sum, s) => sum + parseInt(s.count), 0);

      const neighborhoods = stats.map(s => ({
        name: s.neighborhood,
        count: parseInt(s.count),
        percentage: total > 0 ? Math.round((parseInt(s.count) / total) * 100 * 10) / 10 : 0,
        latitude: s.avgLatitude ? parseFloat(s.avgLatitude) : null,
        longitude: s.avgLongitude ? parseFloat(s.avgLongitude) : null,
      }));

      this.logger.log(`Encontrados ${neighborhoods.length} bairros`);

      return {
        neighborhoods,
        total,
      };
    } catch (error) {
      this.logger.error('Erro ao buscar estatísticas por bairro:', error);
      throw error;
    }
  }

  // Método para geocodificar eleitores que não têm coordenadas
  async geocodePendingVoters(vereadorId: string, limit: number = 10): Promise<{
    processed: number;
    success: number;
    failed: number;
  }> {
    try {
      this.logger.log(`Geocodificando eleitores pendentes para vereador: ${vereadorId}`);

      // Buscar eleitores sem coordenadas que tenham pelo menos algum dado de endereço
      // Mais flexível: aceita se tiver neighborhood OU street OU cep
      const pendingVoters = await this.votersRepository
        .createQueryBuilder('voter')
        .where('voter.vereadorId = :vereadorId', { vereadorId })
        .andWhere('voter.latitude IS NULL')
        .andWhere('(voter.neighborhood IS NOT NULL OR voter.street IS NOT NULL OR voter.cep IS NOT NULL)')
        .limit(limit)
        .getMany();

      this.logger.log(`Encontrados ${pendingVoters.length} eleitores pendentes para geocodificar`);

      let success = 0;
      let failed = 0;

      for (const voter of pendingVoters) {
        this.logger.log(`Geocodificando eleitor ${voter.id}: ${voter.street}, ${voter.neighborhood}, ${voter.city}`);

        const geoResult = await this.geocodingService.geocodeAddress(
          voter.street || '',
          voter.number || '',
          voter.neighborhood || '',
          voter.city || '',
          voter.state || '',
          voter.cep,
        );

        if (geoResult) {
          await this.votersRepository.update(voter.id, {
            latitude: geoResult.latitude,
            longitude: geoResult.longitude,
          });
          success++;
          this.logger.log(`Eleitor ${voter.id} geocodificado: (${geoResult.latitude}, ${geoResult.longitude})`);
        } else {
          failed++;
          this.logger.warn(`Falha ao geocodificar eleitor ${voter.id}`);
        }
      }

      this.logger.log(`Geocodificação concluída: ${success} sucesso, ${failed} falha`);

      return {
        processed: pendingVoters.length,
        success,
        failed,
      };
    } catch (error) {
      this.logger.error('Erro ao geocodificar eleitores pendentes:', error);
      throw error;
    }
  }
}