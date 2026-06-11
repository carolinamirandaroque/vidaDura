import { Controller, Get, Post, Patch, Delete, Body, Param, Query } from '@nestjs/common';
import { ApiTags, ApiOperation, ApiBearerAuth } from '@nestjs/swagger';
import { TasksService } from './tasks.service';
import { CreateTaskDto } from './dto/create-task.dto';
import { UpdateTaskDto } from './dto/update-task.dto';
import { CurrentUser } from '../../common/decorators/current-user.decorator';

@ApiTags('tasks')
@ApiBearerAuth()
@Controller('tasks')
export class TasksController {
  constructor(private tasksService: TasksService) {}

  @Get()
  @ApiOperation({ summary: 'List tasks as tree' })
  findAll(
    @CurrentUser('sub') userId: string,
    @Query('status') status?: string,
    @Query('priority') priority?: string,
    @Query('search') search?: string,
  ) {
    return this.tasksService.findAll(userId, { status, priority, search } as Parameters<TasksService['findAll']>[1]);
  }

  @Post('reorder')
  @ApiOperation({ summary: 'Reorder tasks (drag and drop)' })
  reorder(
    @CurrentUser('sub') userId: string,
    @Body() updates: { id: string; position: number; parentTaskId?: string | null }[],
  ) {
    return this.tasksService.reorder(userId, updates);
  }

  @Get(':id')
  @ApiOperation({ summary: 'Get task by ID' })
  findOne(@CurrentUser('sub') userId: string, @Param('id') id: string) {
    return this.tasksService.findOne(userId, id);
  }

  @Post()
  @ApiOperation({ summary: 'Create task' })
  create(@CurrentUser('sub') userId: string, @Body() dto: CreateTaskDto) {
    return this.tasksService.create(userId, dto);
  }

  @Patch(':id')
  @ApiOperation({ summary: 'Update task' })
  update(
    @CurrentUser('sub') userId: string,
    @Param('id') id: string,
    @Body() dto: UpdateTaskDto,
  ) {
    return this.tasksService.update(userId, id, dto);
  }

  @Delete(':id')
  @ApiOperation({ summary: 'Delete task and subtrees' })
  remove(@CurrentUser('sub') userId: string, @Param('id') id: string) {
    return this.tasksService.remove(userId, id);
  }
}
