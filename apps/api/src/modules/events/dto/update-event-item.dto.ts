import { IsBoolean, IsEnum, IsOptional, IsString, MinLength, ValidateIf } from 'class-validator';
import { ApiPropertyOptional } from '@nestjs/swagger';
import { EventItemType } from '@prisma/client';

export class UpdateEventItemDto {
  @ApiPropertyOptional()
  @IsOptional()
  @IsString()
  @MinLength(1)
  title?: string;

  @ApiPropertyOptional()
  @IsOptional()
  @IsString()
  description?: string;

  @ApiPropertyOptional({ enum: EventItemType })
  @IsOptional()
  @IsEnum(EventItemType)
  type?: EventItemType;

  @ApiPropertyOptional()
  @IsOptional()
  @IsBoolean()
  done?: boolean;

  @ApiPropertyOptional({ nullable: true })
  @IsOptional()
  @ValidateIf((_, v) => v !== null)
  @IsString()
  assigneeId?: string | null;
}
