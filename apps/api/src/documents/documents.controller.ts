import {
  ArgumentsHost,
  Body,
  Catch,
  Controller,
  Delete,
  Get,
  HttpCode,
  HttpStatus,
  Module,
  Param,
  Patch,
  PayloadTooLargeException,
  Post,
  Query,
  Res,
  UploadedFile,
  UseFilters,
  UseInterceptors,
} from '@nestjs/common';
import { FileInterceptor } from '@nestjs/platform-express';
import { ApiBody, ApiConsumes, ApiCookieAuth, ApiOperation, ApiResponse, ApiTags } from '@nestjs/swagger';
import { Prisma } from '@prisma/client';
import type { Response } from 'express';
import { memoryStorage } from 'multer';
import { AppError } from '../common/app-error';
import { CurrentUser, type AuthUser } from '../common/decorators';
import { ErrorResponse } from '../common/error-response.dto';
import { AllExceptionsFilter } from '../common/filters/all-exceptions.filter';
import { SESSION_COOKIE } from '../common/guards';
import { UuidParam } from '../common/pipes';
import { assertSupportedFile, convertFileToDoc, MAX_IMPORT_BYTES, titleFromFilename } from '../import/converter';
import {
  CreateDocumentDto,
  CreateShareDto,
  DocDetailDto,
  DocListDto,
  DocSavedDto,
  ImportFileDto,
  ListDocumentsQuery,
  ShareDto,
  ShareListDto,
  UpdateDocumentDto,
} from './documents.dto';
import { DocumentsService } from './documents.service';
import { SharesService } from './shares.service';

const E = (status: number, description: string): ReturnType<typeof ApiResponse> =>
  ApiResponse({ status, type: ErrorResponse, description });

// Maps multer's size-limit error to FILE_TOO_LARGE.
@Catch()
class ImportErrorFilter extends AllExceptionsFilter {
  override catch(exception: unknown, host: ArgumentsHost): void {
    if (exception instanceof PayloadTooLargeException) {
      exception = new AppError(HttpStatus.PAYLOAD_TOO_LARGE, 'FILE_TOO_LARGE', 'File is larger than 5 MB');
    }
    super.catch(exception, host);
  }
}

@ApiTags('documents')
@ApiCookieAuth(SESSION_COOKIE)
@E(401, 'UNAUTHENTICATED')
@Controller('documents')
export class DocumentsController {
  constructor(
    private readonly docs: DocumentsService,
    private readonly shares: SharesService,
  ) {}

  @Get()
  @ApiOperation({ summary: 'List documents I own and documents shared with me' })
  @ApiResponse({ status: 200, type: DocListDto })
  @E(400, 'VALIDATION_ERROR (bad limit or cursor)')
  list(@CurrentUser() user: AuthUser, @Query() query: ListDocumentsQuery): Promise<DocListDto> {
    return this.docs.list(user.id, query.limit, query.cursor);
  }

  @Post()
  @ApiOperation({ summary: 'Create a blank document' })
  @ApiResponse({ status: 201, type: DocDetailDto })
  @E(400, 'VALIDATION_ERROR')
  @E(403, 'BAD_ORIGIN')
  @E(415, 'UNSUPPORTED_MEDIA_TYPE')
  async create(
    @CurrentUser() user: AuthUser,
    @Body() dto: CreateDocumentDto,
    @Res({ passthrough: true }) res: Response,
  ): Promise<DocDetailDto> {
    const doc = await this.docs.create(user.id, dto.title);
    res.location(`/api/documents/${doc.id}`);
    return doc;
  }

  @Post('import')
  @UseFilters(ImportErrorFilter)
  @UseInterceptors(FileInterceptor('file', { storage: memoryStorage(), limits: { fileSize: MAX_IMPORT_BYTES, files: 1 } }))
  @ApiOperation({ summary: 'Import a .txt, .md or .docx file as a new document' })
  @ApiConsumes('multipart/form-data')
  @ApiBody({ type: ImportFileDto })
  @ApiResponse({ status: 201, type: DocDetailDto })
  @E(400, 'UNSUPPORTED_TYPE | EMPTY_FILE')
  @E(403, 'BAD_ORIGIN')
  @E(413, 'FILE_TOO_LARGE')
  @E(422, 'UNREADABLE_FILE')
  @E(415, 'UNSUPPORTED_MEDIA_TYPE (not multipart/form-data)')
  async import(
    @CurrentUser() user: AuthUser,
    @UploadedFile() file: Express.Multer.File | undefined,
    @Res({ passthrough: true }) res: Response,
  ): Promise<DocDetailDto> {
    if (!file || file.size === 0) {
      throw new AppError(HttpStatus.BAD_REQUEST, 'EMPTY_FILE', 'The file is empty');
    }
    const filename = Buffer.from(file.originalname, 'latin1').toString('utf8');
    assertSupportedFile(filename, file.mimetype);
    const content = await convertFileToDoc(file.buffer, filename);
    const doc = await this.docs.create(user.id, titleFromFilename(filename), content as Prisma.InputJsonValue);
    res.location(`/api/documents/${doc.id}`);
    return doc;
  }

  @Get(':id')
  @ApiOperation({ summary: 'Get a document (owner, editor or viewer)' })
  @ApiResponse({ status: 200, type: DocDetailDto })
  @E(404, 'NOT_FOUND (missing, malformed id, or no access)')
  get(@CurrentUser() user: AuthUser, @Param('id', UuidParam) id: string): Promise<DocDetailDto> {
    return this.docs.get(user.id, id);
  }

  @Patch(':id')
  @ApiOperation({ summary: 'Rename and/or save content (owner or editor); content needs baseVersion' })
  @ApiResponse({ status: 200, type: DocSavedDto })
  @E(400, 'VALIDATION_ERROR | INVALID_CONTENT')
  @E(403, 'FORBIDDEN (viewer) | BAD_ORIGIN')
  @E(404, 'NOT_FOUND')
  @E(409, 'VERSION_CONFLICT (includes currentVersion)')
  @E(413, 'CONTENT_TOO_LARGE')
  update(
    @CurrentUser() user: AuthUser,
    @Param('id', UuidParam) id: string,
    @Body() dto: UpdateDocumentDto,
  ): Promise<DocSavedDto> {
    return this.docs.update(user.id, id, dto);
  }

  @Delete(':id')
  @HttpCode(HttpStatus.NO_CONTENT)
  @ApiOperation({ summary: 'Delete a document (owner only); shares cascade' })
  @ApiResponse({ status: 204, description: 'Deleted' })
  @E(403, 'FORBIDDEN (grantee) | BAD_ORIGIN')
  @E(404, 'NOT_FOUND')
  remove(@CurrentUser() user: AuthUser, @Param('id', UuidParam) id: string): Promise<void> {
    return this.docs.remove(user.id, id);
  }

  @Get(':id/shares')
  @ApiOperation({ summary: 'List who a document is shared with (owner only)' })
  @ApiResponse({ status: 200, type: ShareListDto })
  @E(403, 'FORBIDDEN (grantee)')
  @E(404, 'NOT_FOUND')
  listShares(@CurrentUser() user: AuthUser, @Param('id', UuidParam) id: string): Promise<ShareListDto> {
    return this.shares.list(user.id, id);
  }

  @Post(':id/shares')
  @ApiOperation({ summary: 'Share a document with another user by email (owner only)' })
  @ApiResponse({ status: 201, type: ShareDto })
  @E(400, 'VALIDATION_ERROR')
  @E(403, 'FORBIDDEN | BAD_ORIGIN')
  @E(404, 'NOT_FOUND | USER_NOT_FOUND')
  @E(409, 'ALREADY_SHARED')
  @E(422, 'SELF_SHARE')
  async createShare(
    @CurrentUser() user: AuthUser,
    @Param('id', UuidParam) id: string,
    @Body() dto: CreateShareDto,
    @Res({ passthrough: true }) res: Response,
  ): Promise<ShareDto> {
    const share = await this.shares.create(user.id, id, dto);
    res.location(`/api/documents/${id}/shares/${share.userId}`);
    return share;
  }

  @Delete(':id/shares/:userId')
  @HttpCode(HttpStatus.NO_CONTENT)
  @ApiOperation({ summary: 'Revoke a share (owner only)' })
  @ApiResponse({ status: 204, description: 'Revoked' })
  @E(403, 'FORBIDDEN | BAD_ORIGIN')
  @E(404, 'NOT_FOUND (doc not accessible, or no such share)')
  removeShare(
    @CurrentUser() user: AuthUser,
    @Param('id', UuidParam) id: string,
    @Param('userId', UuidParam) userId: string,
  ): Promise<void> {
    return this.shares.remove(user.id, id, userId);
  }
}

@Module({ controllers: [DocumentsController], providers: [DocumentsService, SharesService] })
export class DocumentsModule {}
