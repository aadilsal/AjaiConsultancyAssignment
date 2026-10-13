import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';

export class ErrorBody {
  @ApiProperty({ example: 'NOT_FOUND' }) code: string;
  @ApiProperty({ example: 'Document not found.' }) message: string;
  @ApiPropertyOptional({ type: [String], description: 'VALIDATION_ERROR only' }) details?: string[];
  @ApiPropertyOptional({ example: 7, description: 'VERSION_CONFLICT only' }) currentVersion?: number;
}

export class ErrorResponse {
  @ApiProperty({ type: ErrorBody }) error: ErrorBody;
}
