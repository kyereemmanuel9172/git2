import { IsDateString, IsInt, IsNotEmpty, IsOptional, IsString, IsArray, Max, Min } from 'class-validator';
import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';

export class CreatePodcastDto {
  @ApiProperty({ description: 'Episode title', example: 'The Power of Prayer' })
  @IsString()
  @IsNotEmpty()
  title: string;

  @ApiPropertyOptional({ description: 'Speaker or presenter name' })
  @IsOptional()
  @IsString()
  speaker?: string;

  @ApiPropertyOptional({ description: 'Series name (e.g., "Faith Foundations")' })
  @IsOptional()
  @IsString()
  series?: string;

  @ApiPropertyOptional({ description: 'Episode number within the series' })
  @IsOptional()
  @IsInt()
  @Min(1)
  episodeNumber?: number;

  @ApiPropertyOptional({ description: 'Publish date (ISO 8601)' })
  @IsOptional()
  @IsDateString()
  publishDate?: string;

  @ApiPropertyOptional({ description: 'Duration in minutes', minimum: 0, maximum: 10000 })
  @IsOptional()
  @IsInt()
  @Min(0)
  @Max(10000)
  durationMinutes?: number;

  @ApiPropertyOptional({ description: 'Audio file URL' })
  @IsOptional()
  @IsString()
  audioUrl?: string;

  @ApiPropertyOptional({ description: 'Artwork image URL' })
  @IsOptional()
  @IsString()
  artworkUrl?: string;

  @ApiPropertyOptional({ description: 'Episode description' })
  @IsOptional()
  @IsString()
  description?: string;

  @ApiPropertyOptional({ description: 'Tags for categorization', type: [String] })
  @IsOptional()
  @IsArray()
  @IsString({ each: true })
  tags?: string[];
}

export class UpdatePodcastDto {
  @ApiPropertyOptional({ description: 'Episode title' })
  @IsOptional()
  @IsString()
  @IsNotEmpty()
  title?: string;

  @ApiPropertyOptional({ description: 'Speaker or presenter name' })
  @IsOptional()
  @IsString()
  speaker?: string;

  @ApiPropertyOptional({ description: 'Series name' })
  @IsOptional()
  @IsString()
  series?: string;

  @ApiPropertyOptional({ description: 'Episode number within the series' })
  @IsOptional()
  @IsInt()
  @Min(1)
  episodeNumber?: number;

  @ApiPropertyOptional({ description: 'Publish date (ISO 8601)' })
  @IsOptional()
  @IsDateString()
  publishDate?: string;

  @ApiPropertyOptional({ description: 'Duration in minutes' })
  @IsOptional()
  @IsInt()
  @Min(0)
  @Max(10000)
  durationMinutes?: number;

  @ApiPropertyOptional({ description: 'Audio file URL' })
  @IsOptional()
  @IsString()
  audioUrl?: string;

  @ApiPropertyOptional({ description: 'Artwork image URL' })
  @IsOptional()
  @IsString()
  artworkUrl?: string;

  @ApiPropertyOptional({ description: 'Episode description' })
  @IsOptional()
  @IsString()
  description?: string;

  @ApiPropertyOptional({ description: 'Tags for categorization', type: [String] })
  @IsOptional()
  @IsArray()
  @IsString({ each: true })
  tags?: string[];
}
