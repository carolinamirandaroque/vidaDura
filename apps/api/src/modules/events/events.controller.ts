import { Controller, Get, Post, Patch, Delete, Body, Param, Query } from '@nestjs/common';
import { ApiTags, ApiOperation, ApiBearerAuth } from '@nestjs/swagger';
import { EventsService } from './events.service';
import { CreateEventDto } from './dto/create-event.dto';
import { UpdateEventDto } from './dto/update-event.dto';
import { CreateEventTaskDto } from './dto/create-event-task.dto';
import { CreateEventItemDto } from './dto/create-event-item.dto';
import { UpdateEventItemDto } from './dto/update-event-item.dto';
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

  @Post()
  @ApiOperation({ summary: 'Create event' })
  create(@CurrentUser('sub') userId: string, @Body() dto: CreateEventDto) {
    return this.eventsService.create(userId, dto);
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

  @Delete(':id')
  @ApiOperation({ summary: 'Delete event' })
  remove(@CurrentUser('sub') userId: string, @Param('id') id: string) {
    return this.eventsService.remove(userId, id);
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
