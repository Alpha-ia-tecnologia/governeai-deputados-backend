import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { PoliticalContact } from './political-contact.entity';
import { PoliticalContactsService } from './political-contacts.service';
import { PoliticalContactsController } from './political-contacts.controller';

@Module({
    imports: [TypeOrmModule.forFeature([PoliticalContact])],
    controllers: [PoliticalContactsController],
    providers: [PoliticalContactsService],
    exports: [PoliticalContactsService],
})
export class PoliticalContactsModule { }
