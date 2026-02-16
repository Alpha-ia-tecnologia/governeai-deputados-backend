import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { ConfigModule } from '@nestjs/config';
import { AuthModule } from './auth/auth.module';
import { UsersModule } from './users/users.module';
import { VotersModule } from './voters/voters.module';
import { LeadersModule } from './leaders/leaders.module';
import { HelpRecordsModule } from './help-records/help-records.module';
import { VisitsModule } from './visits/visits.module';
import { ProjectsModule } from './projects/projects.module';
import { AmendmentsModule } from './amendments/amendments.module';
import { AppointmentsModule } from './appointments/appointments.module';
import { MigrationModule } from './migration/migration.module';
import { ElectionResultsModule } from './election-results/election-results.module';
import { CitiesModule } from './cities/cities.module';
import { ExecutiveRequestsModule } from './executive-requests/executive-requests.module';
import { AiModule } from './ai/ai.module';
import { StaffModule } from './staff/staff.module';
import { TasksModule } from './tasks/tasks.module';
import { BillsModule } from './bills/bills.module';
import { VotingRecordsModule } from './voting-records/voting-records.module';
import { PoliticalContactsModule } from './political-contacts/political-contacts.module';
import { CeapModule } from './ceap/ceap.module';
import { AuditLogModule } from './audit-log/audit-log.module';
import { getDatabaseConfig } from './config/database.config';

@Module({
  imports: [
    ConfigModule.forRoot({
      isGlobal: true,
      envFilePath: ['.env', '.env.local'],
    }),
    TypeOrmModule.forRoot(getDatabaseConfig()),
    AuthModule,
    UsersModule,
    VotersModule,
    LeadersModule,
    HelpRecordsModule,
    VisitsModule,
    ProjectsModule,
    AmendmentsModule,
    AppointmentsModule,
    MigrationModule,
    ElectionResultsModule,
    CitiesModule,
    ExecutiveRequestsModule,
    AiModule,
    StaffModule,
    TasksModule,
    BillsModule,
    VotingRecordsModule,
    PoliticalContactsModule,
    CeapModule,
    AuditLogModule,
  ],
})
export class AppModule { }
