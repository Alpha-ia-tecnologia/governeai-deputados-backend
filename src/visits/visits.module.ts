import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { Visit } from './visit.entity';
import { VisitsService } from './visits.service';
import { VisitsController } from './visits.controller';
import { Voter } from '../voters/voter.entity';
import { Leader } from '../leaders/leader.entity';
import { User } from '../users/user.entity';

@Module({
  imports: [TypeOrmModule.forFeature([Visit, Voter, Leader, User])],
  controllers: [VisitsController],
  providers: [VisitsService],
  exports: [VisitsService],
})
export class VisitsModule {}
