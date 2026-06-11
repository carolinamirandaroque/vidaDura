import { Controller, Get, Post, Patch, Delete, Body, Param } from '@nestjs/common';
import { ApiTags, ApiOperation, ApiBearerAuth } from '@nestjs/swagger';
import { ExpensesService } from './expenses.service';
import { CreateExpenseDto } from './dto/create-expense.dto';
import { UpdateExpenseDto } from './dto/update-expense.dto';
import { SettleShareDto } from './dto/settle-share.dto';
import { CurrentUser } from '../../common/decorators/current-user.decorator';

@ApiTags('expenses')
@ApiBearerAuth()
@Controller('expenses')
export class ExpensesController {
  constructor(private expensesService: ExpensesService) {}

  @Get()
  @ApiOperation({ summary: 'List expenses' })
  findAll(@CurrentUser('sub') userId: string) {
    return this.expensesService.findAll(userId);
  }

  @Get('balances')
  @ApiOperation({ summary: 'Get balances between contacts' })
  getBalances(@CurrentUser('sub') userId: string) {
    return this.expensesService.getBalances(userId);
  }

  @Get('debts')
  @ApiOperation({ summary: 'Get simplified debts (who owes whom)' })
  getDebts(@CurrentUser('sub') userId: string) {
    return this.expensesService.getDebts(userId);
  }

  @Get(':id')
  @ApiOperation({ summary: 'Get expense by ID' })
  findOne(@CurrentUser('sub') userId: string, @Param('id') id: string) {
    return this.expensesService.findOne(userId, id);
  }

  @Post()
  @ApiOperation({ summary: 'Create expense' })
  create(@CurrentUser('sub') userId: string, @Body() dto: CreateExpenseDto) {
    return this.expensesService.create(userId, dto);
  }

  @Patch(':id')
  @ApiOperation({ summary: 'Update expense' })
  update(
    @CurrentUser('sub') userId: string,
    @Param('id') id: string,
    @Body() dto: UpdateExpenseDto,
  ) {
    return this.expensesService.update(userId, id, dto);
  }

  @Patch(':id/shares/:shareId')
  @ApiOperation({ summary: 'Settle or unsettle an individual share' })
  settleShare(
    @CurrentUser('sub') userId: string,
    @Param('id') id: string,
    @Param('shareId') shareId: string,
    @Body() dto: SettleShareDto,
  ) {
    return this.expensesService.settleShare(userId, id, shareId, dto.settled);
  }

  @Delete(':id')
  @ApiOperation({ summary: 'Delete expense' })
  remove(@CurrentUser('sub') userId: string, @Param('id') id: string) {
    return this.expensesService.remove(userId, id);
  }
}
