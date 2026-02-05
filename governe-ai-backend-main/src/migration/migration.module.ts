import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { MigrationController } from './migration.controller';
import { MigrationService } from './migration.service';
import { User } from '../users/user.entity';
import { Leader } from '../leaders/leader.entity';
import { Voter } from '../voters/voter.entity';
import { Visit } from '../visits/visit.entity';
import { HelpRecord } from '../help-records/help-record.entity';
import { Appointment } from '../appointments/appointment.entity';
import { LawProject } from '../projects/project.entity';
import { Amendment } from '../amendments/amendment.entity';

@Module({
  imports: [
    TypeOrmModule.forFeature([
      User,
      Leader,
      Voter,
      Visit,
      HelpRecord,
      Appointment,
      LawProject,
      Amendment,
    ]),
  ],
  controllers: [MigrationController],
  providers: [MigrationService],
  exports: [MigrationService],
})
export class MigrationModule {}
