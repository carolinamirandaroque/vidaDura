import { Module } from '@nestjs/common';
import { CalendarsController } from './calendars.controller';
import { CalendarsService } from './calendars.service';
import { CalendarsRepository } from './calendars.repository';

@Module({
  controllers: [CalendarsController],
  providers: [CalendarsService, CalendarsRepository],
  exports: [CalendarsService, CalendarsRepository],
})
export class CalendarsModule {}
