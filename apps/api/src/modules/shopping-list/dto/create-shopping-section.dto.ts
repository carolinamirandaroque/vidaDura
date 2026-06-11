import { IsArray, IsOptional, IsString, MinLength } from 'class-validator';
import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';

export class CreateShoppingSectionDto {
  @ApiProperty()
  @IsString()
  @MinLength(1)
  name: string;

  @ApiPropertyOptional({ type: [String], description: 'Contact user IDs to share with' })
  @IsOptional()
  @IsArray()
  @IsString({ each: true })
  memberIds?: string[];
}
