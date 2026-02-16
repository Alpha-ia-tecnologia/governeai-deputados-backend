import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { CeapExpense } from './ceap-expense.entity';
import { CeapService } from './ceap.service';
import { CeapController } from './ceap.controller';

@Module({
    imports: [TypeOrmModule.forFeature([CeapExpense])],
    controllers: [CeapController],
    providers: [CeapService],
    exports: [CeapService],
})
export class CeapModule { }
