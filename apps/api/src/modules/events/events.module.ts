import { Module } from '@nestjs/common';
import { EventsController } from './events.controller';
import { EventsService } from './events.service';
import { EventsRepository } from './events.repository';
import { CalendarsModule } from '../calendars/calendars.module';
import { NotificationsModule } from '../notifications/notifications.module';
import { TasksModule } from '../tasks/tasks.module';
import { ExpensesModule } from '../expenses/expenses.module';
import { ShoppingListModule } from '../shopping-list/shopping-list.module';

@Module({
  imports: [CalendarsModule, NotificationsModule, TasksModule, ExpensesModule, ShoppingListModule],
  controllers: [EventsController],
  providers: [EventsService, EventsRepository],
  exports: [EventsService, EventsRepository],
})
export class EventsModule {}
