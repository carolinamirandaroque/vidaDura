import { IsBoolean, IsOptional, IsString, MinLength } from 'class-validator';
import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';

export class CreateShoppingItemDto {
  @ApiProperty()
  @IsString()
  @MinLength(1)
  title: string;

  @ApiProperty()
  @IsString()
  sectionId: string;

  @ApiPropertyOptional({ description: 'Item already at home — no need to buy now' })
  @IsOptional()
  @IsBoolean()
  inStock?: boolean;
}
