import { Controller, Get, Post, Patch, Delete, Body, Param } from '@nestjs/common';
import { ApiTags, ApiOperation, ApiBearerAuth } from '@nestjs/swagger';
import { CalendarsService } from './calendars.service';
import { CreateCalendarDto } from './dto/create-calendar.dto';
import { UpdateCalendarDto } from './dto/update-calendar.dto';
import { AddMemberDto } from './dto/add-member.dto';
import { CurrentUser } from '../../common/decorators/current-user.decorator';

@ApiTags('calendars')
@ApiBearerAuth()
@Controller('calendars')
export class CalendarsController {
  constructor(private calendarsService: CalendarsService) {}

  @Get()
  @ApiOperation({ summary: 'List user calendars' })
  findAll(@CurrentUser('sub') userId: string) {
    return this.calendarsService.findAll(userId);
  }

  @Get(':id')
  @ApiOperation({ summary: 'Get calendar by ID' })
  findOne(@CurrentUser('sub') userId: string, @Param('id') id: string) {
    return this.calendarsService.findOne(userId, id);
  }

  @Post()
  @ApiOperation({ summary: 'Create calendar' })
  create(@CurrentUser('sub') userId: string, @Body() dto: CreateCalendarDto) {
    return this.calendarsService.create(userId, dto);
  }

  @Patch(':id')
  @ApiOperation({ summary: 'Update calendar' })
  update(
    @CurrentUser('sub') userId: string,
    @Param('id') id: string,
    @Body() dto: UpdateCalendarDto,
  ) {
    return this.calendarsService.update(userId, id, dto);
  }

  @Delete(':id')
  @ApiOperation({ summary: 'Delete calendar' })
  remove(@CurrentUser('sub') userId: string, @Param('id') id: string) {
    return this.calendarsService.remove(userId, id);
  }

  @Post(':id/members')
  @ApiOperation({ summary: 'Add calendar member' })
  addMember(
    @CurrentUser('sub') userId: string,
    @Param('id') id: string,
    @Body() dto: AddMemberDto,
  ) {
    return this.calendarsService.addMember(userId, id, dto);
  }

  @Delete(':id/members/:memberId')
  @ApiOperation({ summary: 'Remove calendar member' })
  removeMember(
    @CurrentUser('sub') userId: string,
    @Param('id') id: string,
    @Param('memberId') memberId: string,
  ) {
    return this.calendarsService.removeMember(userId, id, memberId);
  }
}
