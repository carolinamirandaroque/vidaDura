import { Controller, Get, Post, Patch, Delete, Body, Param, Query } from '@nestjs/common';
import { ApiTags, ApiOperation, ApiBearerAuth } from '@nestjs/swagger';
import { EventsService } from './events.service';
import { CreateEventDto } from './dto/create-event.dto';
import { CreateDeadlineDto } from './dto/create-deadline.dto';
import { UpdateEventDto } from './dto/update-event.dto';
import { CreateEventTaskDto } from './dto/create-event-task.dto';
import { CreateEventItemDto } from './dto/create-event-item.dto';
import { UpdateEventItemDto } from './dto/update-event-item.dto';
import { UpdateEventTaskDto } from './dto/update-event-task.dto';
import { CreateExpenseDto } from '../expenses/dto/create-expense.dto';
import { CurrentUser } from '../../common/decorators/current-user.decorator';

@ApiTags('events')
@ApiBearerAuth()
@Controller('events')
export class EventsController {
  constructor(private eventsService: EventsService) {}

  @Get()
  @ApiOperation({ summary: 'List events' })
  findAll(
    @CurrentUser('sub') userId: string,
    @Query('start') start?: string,
    @Query('end') end?: string,
  ) {
    return this.eventsService.findAll(userId, start, end);
  }

  @Get('invites')
  @ApiOperation({ summary: 'List pending event invites' })
  getPendingInvites(@CurrentUser('sub') userId: string) {
    return this.eventsService.getPendingInvites(userId);
  }

  @Get(':id/detail')
  @ApiOperation({ summary: 'Get full event hub detail' })
  getDetail(@CurrentUser('sub') userId: string, @Param('id') id: string) {
    return this.eventsService.getDetail(userId, id);
  }

  @Get(':id')
  @ApiOperation({ summary: 'Get event by ID' })
  findOne(@CurrentUser('sub') userId: string, @Param('id') id: string) {
    return this.eventsService.findOne(userId, id);
  }

  @Post(':id/tasks')
  @ApiOperation({ summary: 'Add task to event hub' })
  addTask(
    @CurrentUser('sub') userId: string,
    @Param('id') id: string,
    @Body() dto: CreateEventTaskDto,
  ) {
    return this.eventsService.addTask(userId, id, dto);
  }

  @Patch(':id/tasks/:taskId')
  @ApiOperation({ summary: 'Update event task' })
  updateTask(
    @CurrentUser('sub') userId: string,
    @Param('id') id: string,
    @Param('taskId') taskId: string,
    @Body() dto: UpdateEventTaskDto,
  ) {
    return this.eventsService.updateTask(userId, id, taskId, dto);
  }

  @Delete(':id/tasks/:taskId')
  @ApiOperation({ summary: 'Delete event task' })
  removeTask(
    @CurrentUser('sub') userId: string,
    @Param('id') id: string,
    @Param('taskId') taskId: string,
  ) {
    return this.eventsService.removeTask(userId, id, taskId);
  }

  @Post(':id/expenses')
  @ApiOperation({ summary: 'Add expense to event hub' })
  addExpense(
    @CurrentUser('sub') userId: string,
    @Param('id') id: string,
    @Body() dto: CreateExpenseDto,
  ) {
    return this.eventsService.addExpense(userId, id, dto);
  }

  @Post(':id/items')
  @ApiOperation({ summary: 'Add item (buy/bring/reminder) to event' })
  addItem(
    @CurrentUser('sub') userId: string,
    @Param('id') id: string,
    @Body() dto: CreateEventItemDto,
  ) {
    return this.eventsService.addItem(userId, id, dto);
  }

  @Patch(':id/items/:itemId')
  @ApiOperation({ summary: 'Update event item' })
  updateItem(
    @CurrentUser('sub') userId: string,
    @Param('id') id: string,
    @Param('itemId') itemId: string,
    @Body() dto: UpdateEventItemDto,
  ) {
    return this.eventsService.updateItem(userId, id, itemId, dto);
  }

  @Delete(':id/items/:itemId')
  @ApiOperation({ summary: 'Delete event item' })
  removeItem(
    @CurrentUser('sub') userId: string,
    @Param('id') id: string,
    @Param('itemId') itemId: string,
  ) {
    return this.eventsService.removeItem(userId, id, itemId);
  }

  @Post('deadline')
  @ApiOperation({ summary: 'Create deadline reminder' })
  createDeadline(@CurrentUser('sub') userId: string, @Body() dto: CreateDeadlineDto) {
    return this.eventsService.create(userId, {
      ...dto,
      kind: 'deadline',
      type: 'other',
      allDay: true,
    });
  }

  @Post()
  @ApiOperation({ summary: 'Create event' })
  create(@CurrentUser('sub') userId: string, @Body() dto: CreateEventDto) {
    return this.eventsService.create(userId, dto);
  }

  @Patch(':id/complete-deadline')
  @ApiOperation({ summary: 'Mark deadline as done (advances if recurring)' })
  completeDeadline(@CurrentUser('sub') userId: string, @Param('id') id: string) {
    return this.eventsService.completeDeadline(userId, id);
  }

  @Patch(':id')
  @ApiOperation({ summary: 'Update event' })
  update(
    @CurrentUser('sub') userId: string,
    @Param('id') id: string,
    @Body() dto: UpdateEventDto,
  ) {
    return this.eventsService.update(userId, id, dto);
  }

  @Delete(':id/occurrence')
  @ApiOperation({ summary: 'Skip one occurrence of a recurring event or reminder' })
  deleteOccurrence(
    @CurrentUser('sub') userId: string,
    @Param('id') id: string,
    @Query('occursOn') occursOn: string,
  ) {
    return this.eventsService.deleteRecurringOccurrence(userId, id, occursOn);
  }

  @Delete(':id')
  @ApiOperation({ summary: 'Delete event (creator only)' })
  deleteEvent(@CurrentUser('sub') userId: string, @Param('id') id: string) {
    return this.eventsService.deleteEvent(userId, id);
  }

  @Post(':id/leave')
  @ApiOperation({ summary: 'Leave event (creator or invited participant)' })
  leaveEvent(@CurrentUser('sub') userId: string, @Param('id') id: string) {
    return this.eventsService.leaveEvent(userId, id);
  }

  @Patch(':id/respond/:status')
  @ApiOperation({ summary: 'Respond to event invite' })
  respond(
    @CurrentUser('sub') userId: string,
    @Param('id') id: string,
    @Param('status') status: 'accepted' | 'declined',
  ) {
    return this.eventsService.respondToInvite(userId, id, status);
  }
}
