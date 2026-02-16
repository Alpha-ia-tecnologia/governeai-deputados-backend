import { Injectable, NotFoundException, ForbiddenException, BadRequestException } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { City } from './city.entity';
import { CurrentUserData } from '../common/decorators/current-user.decorator';
import { UserRole } from '../users/user.entity';

@Injectable()
export class CitiesService {
    constructor(
        @InjectRepository(City)
        private citiesRepository: Repository<City>,
    ) { }

    async create(cityData: Partial<City>, currentUser: CurrentUserData): Promise<City> {
        let vereadorId: string;

        if (currentUser.role === UserRole.ADMIN) {
            if (!cityData.vereadorId) {
                throw new BadRequestException('Admin deve especificar o vereadorId ao criar uma cidade');
            }
            vereadorId = cityData.vereadorId;
        } else {
            vereadorId = currentUser.vereadorId;
        }

        const city = this.citiesRepository.create({
            ...cityData,
            vereadorId,
        });
        return await this.citiesRepository.save(city);
    }

    async findAll(vereadorId: string | null): Promise<City[]> {
        if (!vereadorId) {
            return await this.citiesRepository.find({
                order: { name: 'ASC' },
            });
        }

        return await this.citiesRepository.find({
            where: { vereadorId },
            order: { name: 'ASC' },
        });
    }

    async findOne(id: string, vereadorId: string | null): Promise<City> {
        const city = await this.citiesRepository.findOne({ where: { id } });
        if (!city) {
            throw new NotFoundException('Cidade não encontrada');
        }

        if (vereadorId && city.vereadorId !== vereadorId) {
            throw new ForbiddenException('Acesso negado a esta cidade');
        }

        return city;
    }

    async update(id: string, cityData: Partial<City>, vereadorId: string | null): Promise<City> {
        const city = await this.findOne(id, vereadorId);

        const { vereadorId: _, ...dataToUpdate } = cityData as any;
        Object.assign(city, dataToUpdate);

        return await this.citiesRepository.save(city);
    }

    async remove(id: string, vereadorId: string | null): Promise<void> {
        const city = await this.findOne(id, vereadorId);
        await this.citiesRepository.remove(city);
    }
}
