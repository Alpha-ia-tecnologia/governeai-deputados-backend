import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { LegislativeBill } from './bill.entity';
import { BillsService } from './bills.service';
import { BillsController } from './bills.controller';

@Module({
    imports: [TypeOrmModule.forFeature([LegislativeBill])],
    controllers: [BillsController],
    providers: [BillsService],
    exports: [BillsService],
})
export class BillsModule { }
