import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { Amendment } from './amendment.entity';
import { AmendmentsService } from './amendments.service';
import { AmendmentsController } from './amendments.controller';

@Module({
  imports: [TypeOrmModule.forFeature([Amendment])],
  controllers: [AmendmentsController],
  providers: [AmendmentsService],
  exports: [AmendmentsService],
})
export class AmendmentsModule {}
