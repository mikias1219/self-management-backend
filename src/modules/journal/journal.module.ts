import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { JournalService } from './application/services/journal.service';
import { JournalEntry } from './domain/entities/journal-entry.entity';
import { JournalController } from './presentation/controllers/journal.controller';

@Module({
  imports: [TypeOrmModule.forFeature([JournalEntry])],
  controllers: [JournalController],
  providers: [JournalService],
  exports: [JournalService],
})
export class JournalModule {}
