import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';

export class ErrorBody {
  @ApiProperty({ example: 'NOT_FOUND' }) code: string;
  @ApiProperty({ example: 'Document not found.' }) message: string;
  @ApiProperty({ example: '6f1c2a7e-2b9e-4d8e-9a43-0f2b8f3f9d11', description: 'Echo of X-Request-Id' }) requestId: string;
  @ApiPropertyOptional({ type: [String], description: 'VALIDATION_ERROR only' }) details?: string[];
  @ApiPropertyOptional({ example: 7, description: 'VERSION_CONFLICT only' }) currentVersion?: number;
}

export class ErrorResponse {
  @ApiProperty({ type: ErrorBody }) error: ErrorBody;
}
