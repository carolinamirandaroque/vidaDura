import { IsArray, IsInt, IsOptional, IsString, Min, MinLength } from 'class-validator';
import { ApiPropertyOptional } from '@nestjs/swagger';

export class UpdateShoppingSectionDto {
  @ApiPropertyOptional()
  @IsOptional()
  @IsString()
  @MinLength(1)
  name?: string;

  @ApiPropertyOptional()
  @IsOptional()
  @IsInt()
  @Min(0)
  position?: number;

  @ApiPropertyOptional({ type: [String], description: 'Contact user IDs to share with (replaces current)' })
  @IsOptional()
  @IsArray()
  @IsString({ each: true })
  memberIds?: string[];
}
