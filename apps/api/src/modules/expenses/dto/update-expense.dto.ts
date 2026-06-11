import {
  IsArray,
  IsBoolean,
  IsDateString,
  IsNumber,
  IsOptional,
  IsString,
  MinLength,
  ValidateNested,
  Min,
} from 'class-validator';
import { Type } from 'class-transformer';
import { ApiPropertyOptional } from '@nestjs/swagger';

class ExpenseShareDto {
  @ApiPropertyOptional()
  @IsString()
  userId!: string;

  @ApiPropertyOptional()
  @IsNumber()
  @Min(0)
  amountOwed!: number;
}

export class UpdateExpenseDto {
  @ApiPropertyOptional()
  @IsOptional()
  @IsString()
  @MinLength(1)
  title?: string;

  @ApiPropertyOptional()
  @IsOptional()
  @IsString()
  description?: string;

  @ApiPropertyOptional()
  @IsOptional()
  @IsNumber()
  @Min(0.01)
  amount?: number;

  @ApiPropertyOptional()
  @IsOptional()
  @IsString()
  currency?: string;

  @ApiPropertyOptional()
  @IsOptional()
  @IsDateString()
  date?: string;

  @ApiPropertyOptional()
  @IsOptional()
  @IsString()
  paidById?: string;

  @ApiPropertyOptional()
  @IsOptional()
  @IsBoolean()
  settled?: boolean;

  @ApiPropertyOptional({ type: [ExpenseShareDto] })
  @IsOptional()
  @IsArray()
  @ValidateNested({ each: true })
  @Type(() => ExpenseShareDto)
  shares?: ExpenseShareDto[];
}
