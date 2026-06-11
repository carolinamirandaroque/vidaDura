import {
  IsDateString,
  IsEnum,
  IsOptional,
  IsString,
  MinLength,
} from 'class-validator';
import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import { RecurrenceType } from '@prisma/client';

export class CreateDeadlineDto {
  @ApiProperty()
  @IsString()
  calendarId!: string;

  @ApiProperty({ example: 'Pagar a renda' })
  @IsString()
  @MinLength(1)
  title!: string;

  @ApiProperty({ description: 'Due date (start of day ISO)' })
  @IsDateString()
  startDate!: string;

  @ApiProperty({ description: 'Due date (end of day ISO)' })
  @IsDateString()
  endDate!: string;

  @ApiPropertyOptional({ enum: RecurrenceType })
  @IsOptional()
  @IsEnum(RecurrenceType)
  recurrence?: RecurrenceType;

  @ApiPropertyOptional()
  @IsOptional()
  @IsDateString()
  recurrenceEnd?: string;
}
