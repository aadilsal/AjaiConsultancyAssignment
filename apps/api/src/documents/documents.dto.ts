import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import { Transform, Type } from 'class-transformer';
import {
  IsEmail,
  IsIn,
  IsInt,
  IsNotEmpty,
  IsObject,
  IsOptional,
  IsString,
  Max,
  MaxLength,
  Min,
  ValidateIf,
} from 'class-validator';

const trim = ({ value }: { value: unknown }): unknown => (typeof value === 'string' ? value.trim() : value);

export class CreateDocumentDto {
  @ApiPropertyOptional({ example: 'Untitled document', maxLength: 200 })
  @IsOptional()
  @Transform(trim)
  @IsString({ message: 'Title must be text' })
  @IsNotEmpty({ message: "Title can't be empty" })
  @MaxLength(200, { message: 'Title is too long' })
  title?: string;
}

export class UpdateDocumentDto {
  @ApiPropertyOptional({ example: 'Q4 Planning Notes', maxLength: 200 })
  @IsOptional()
  @Transform(trim)
  @IsString({ message: 'Title must be text' })
  @IsNotEmpty({ message: "Title can't be empty" })
  @MaxLength(200, { message: 'Title is too long' })
  title?: string;

  @ApiPropertyOptional({ type: 'object', additionalProperties: true, description: 'Tiptap JSON doc' })
  @IsOptional()
  @IsObject({ message: 'Content must be a Tiptap document' })
  content?: Record<string, unknown>;

  @ApiPropertyOptional({ example: 3, description: 'Required when content is sent' })
  @ValidateIf((o: UpdateDocumentDto) => o.content !== undefined || o.baseVersion !== undefined)
  @IsInt({ message: 'baseVersion is required when saving content' })
  @Min(1, { message: 'baseVersion is required when saving content' })
  baseVersion?: number;
}

export class OwnerDto {
  @ApiProperty({ format: 'uuid' }) id: string;
  @ApiProperty() name: string;
  @ApiProperty() email: string;
}

export class DocSummaryDto {
  @ApiProperty({ format: 'uuid' }) id: string;
  @ApiProperty() title: string;
  @ApiProperty() updatedAt: Date;
  @ApiProperty() createdAt: Date;
  @ApiProperty({ type: OwnerDto }) owner: OwnerDto;
  @ApiProperty({ enum: ['owner', 'editor', 'viewer'] }) access: 'owner' | 'editor' | 'viewer';
}

export class DocDetailDto extends DocSummaryDto {
  @ApiProperty({ type: 'object', additionalProperties: true }) content: unknown;
  @ApiProperty({ example: 1 }) version: number;
}

export class ListDocumentsQuery {
  @ApiPropertyOptional({ minimum: 1, maximum: 100, default: 50, description: 'Page size per list' })
  @IsOptional()
  @Type(() => Number)
  @IsInt({ message: 'limit must be an integer' })
  @Min(1, { message: 'limit must be between 1 and 100' })
  @Max(100, { message: 'limit must be between 1 and 100' })
  limit?: number;

  @ApiPropertyOptional({ description: 'A nextCursor value from a previous page; returns the next page of that list only' })
  @IsOptional()
  @IsString()
  @MaxLength(512)
  cursor?: string;
}

export class NextCursorDto {
  @ApiProperty({ type: String, nullable: true, example: null }) owned: string | null;
  @ApiProperty({ type: String, nullable: true, example: null }) shared: string | null;
}

export class DocListDto {
  @ApiProperty({ type: [DocSummaryDto] }) owned: DocSummaryDto[];
  @ApiProperty({ type: [DocSummaryDto] }) shared: DocSummaryDto[];
  @ApiProperty({ type: NextCursorDto, description: 'Pass one of these as ?cursor= to fetch more of that list' })
  nextCursor: NextCursorDto;
}

export class DocSavedDto {
  @ApiProperty({ format: 'uuid' }) id: string;
  @ApiProperty() title: string;
  @ApiProperty() version: number;
  @ApiProperty() updatedAt: Date;
}

export class CreateShareDto {
  @ApiProperty({ example: 'bob@ajaia.test' })
  @Transform(({ value }: { value: unknown }) => (typeof value === 'string' ? value.trim().toLowerCase() : value))
  @IsEmail({}, { message: 'Enter a valid email address' })
  email: string;

  @ApiPropertyOptional({ enum: ['editor', 'viewer'], default: 'editor' })
  @IsOptional()
  @IsIn(['editor', 'viewer'], { message: 'Role must be editor or viewer' })
  role?: 'editor' | 'viewer';
}

export class ShareDto {
  @ApiProperty({ format: 'uuid' }) userId: string;
  @ApiProperty() name: string;
  @ApiProperty() email: string;
  @ApiProperty({ enum: ['editor', 'viewer'] }) role: 'editor' | 'viewer';
  @ApiProperty() createdAt: Date;
}

export class ShareListDto {
  @ApiProperty({ type: OwnerDto }) owner: OwnerDto;
  @ApiProperty({ type: [ShareDto] }) shares: ShareDto[];
}

export class ImportFileDto {
  @ApiProperty({ type: 'string', format: 'binary', description: '.txt, .md or .docx, max 5 MB' })
  file: unknown;
}
