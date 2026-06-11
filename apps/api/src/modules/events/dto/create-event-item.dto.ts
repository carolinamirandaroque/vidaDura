import { IsEnum, IsOptional, IsString, MinLength } from 'class-validator';
import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import { EventItemType } from '@prisma/client';

export class CreateEventItemDto {
  @ApiProperty()
  @IsString()
  @MinLength(1)
  title!: string;

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
  @IsString()
  assigneeId?: string;
}
