import {
  Controller,
  Get,
  Post,
  Patch,
  Delete,
  Body,
  Param,
  Query,
  HttpCode,
  HttpStatus,
} from '@nestjs/common';
import { ApiTags, ApiOperation, ApiBearerAuth, ApiQuery } from '@nestjs/swagger';
import { ShoppingListService } from './shopping-list.service';
import { CreateShoppingItemDto } from './dto/create-shopping-item.dto';
import { UpdateShoppingItemDto } from './dto/update-shopping-item.dto';
import { CreateShoppingSectionDto } from './dto/create-shopping-section.dto';
import { UpdateShoppingSectionDto } from './dto/update-shopping-section.dto';
import { CurrentUser } from '../../common/decorators/current-user.decorator';

@ApiTags('shopping-list')
@ApiBearerAuth()
@Controller('shopping-list')
export class ShoppingListController {
  constructor(private shoppingListService: ShoppingListService) {}

  @Get('sections')
  @ApiOperation({ summary: 'List shopping sections' })
  findSections(@CurrentUser('sub') userId: string) {
    return this.shoppingListService.findSections(userId);
  }

  @Post('sections')
  @ApiOperation({ summary: 'Create a custom shopping section' })
  createSection(@CurrentUser('sub') userId: string, @Body() dto: CreateShoppingSectionDto) {
    return this.shoppingListService.createSection(userId, dto);
  }

  @Patch('sections/:sectionId')
  @ApiOperation({ summary: 'Rename or reorder a section' })
  updateSection(
    @CurrentUser('sub') userId: string,
    @Param('sectionId') sectionId: string,
    @Body() dto: UpdateShoppingSectionDto,
  ) {
    return this.shoppingListService.updateSection(userId, sectionId, dto);
  }

  @Delete('sections/:sectionId')
  @HttpCode(HttpStatus.NO_CONTENT)
  @ApiOperation({ summary: 'Delete a section (items become uncategorized)' })
  removeSection(@CurrentUser('sub') userId: string, @Param('sectionId') sectionId: string) {
    return this.shoppingListService.removeSection(userId, sectionId);
  }

  @Get()
  @ApiOperation({ summary: 'List shopping items' })
  @ApiQuery({ name: 'done', required: false, type: Boolean })
  findAll(@CurrentUser('sub') userId: string, @Query('done') done?: string) {
    const doneFilter = done === 'true' ? true : done === 'false' ? false : undefined;
    return this.shoppingListService.findAll(userId, doneFilter);
  }

  @Post('reorder')
  @ApiOperation({ summary: 'Reorder shopping items (drag and drop)' })
  reorder(
    @CurrentUser('sub') userId: string,
    @Body() updates: { id: string; position: number }[],
  ) {
    return this.shoppingListService.reorder(userId, updates);
  }

  @Post()
  @ApiOperation({ summary: 'Add item to home shopping list' })
  create(@CurrentUser('sub') userId: string, @Body() dto: CreateShoppingItemDto) {
    return this.shoppingListService.create(userId, dto);
  }

  @Patch(':id')
  @ApiOperation({ summary: 'Update shopping item (mark bought, rename)' })
  update(
    @CurrentUser('sub') userId: string,
    @Param('id') id: string,
    @Body() dto: UpdateShoppingItemDto,
  ) {
    return this.shoppingListService.update(userId, id, dto);
  }

  @Delete(':id')
  @HttpCode(HttpStatus.NO_CONTENT)
  @ApiOperation({ summary: 'Remove shopping item' })
  remove(@CurrentUser('sub') userId: string, @Param('id') id: string) {
    return this.shoppingListService.remove(userId, id);
  }
}
