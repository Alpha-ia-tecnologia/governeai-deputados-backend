import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { Voter } from './voter.entity';
import { VotersService } from './voters.service';
import { VotersController } from './voters.controller';
import { Leader } from '../leaders/leader.entity';
import { HelpRecord } from '../help-records/help-record.entity';
import { Visit } from '../visits/visit.entity';
import { Appointment } from '../appointments/appointment.entity';
import { User } from '../users/user.entity';
import { GeocodingService } from '../common/services/geocoding.service';

@Module({
  imports: [TypeOrmModule.forFeature([Voter, Leader, HelpRecord, Visit, Appointment, User])],
  controllers: [VotersController],
  providers: [VotersService, GeocodingService],
  exports: [VotersService, GeocodingService],
})
export class VotersModule {}
