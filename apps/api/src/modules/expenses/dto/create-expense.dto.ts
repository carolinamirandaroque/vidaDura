import {
  IsArray,
  IsDateString,
  IsNumber,
  IsOptional,
  IsString,
  MinLength,
  ValidateNested,
  Min,
} from 'class-validator';
import { Type } from 'class-transformer';
import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';

class ExpenseShareDto {
  @ApiProperty()
  @IsString()
  userId!: string;

  @ApiProperty()
  @IsNumber()
  @Min(0)
  amountOwed!: number;
}

export class CreateExpenseDto {
  @ApiProperty({ example: 'Jantar' })
  @IsString()
  @MinLength(1)
  title!: string;

  @ApiPropertyOptional()
  @IsOptional()
  @IsString()
  description?: string;

  @ApiProperty({ example: 120.5 })
  @IsNumber()
  @Min(0.01)
  amount!: number;

  @ApiPropertyOptional({ example: 'EUR' })
  @IsOptional()
  @IsString()
  currency?: string;

  @ApiProperty()
  @IsDateString()
  date!: string;

  @ApiPropertyOptional({ description: 'Who paid — defaults to creator' })
  @IsOptional()
  @IsString()
  paidById?: string;

  @ApiProperty({ type: [ExpenseShareDto] })
  @IsArray()
  @ValidateNested({ each: true })
  @Type(() => ExpenseShareDto)
  shares!: ExpenseShareDto[];
}
