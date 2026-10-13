import { HttpStatus, Injectable } from '@nestjs/common';
import { Prisma } from '@prisma/client';
import { AccessRole, AccessService } from '../access/access.service';
import { AppError, notFound } from '../common/app-error';
import { EMPTY_DOC, isValidDoc } from '../editor/extensions';
import { PrismaService } from '../prisma/prisma.service';
import { DocDetailDto, DocListDto, DocSavedDto, DocSummaryDto, UpdateDocumentDto } from './documents.dto';

export const MAX_CONTENT_BYTES = 1024 * 1024;

const ownerSelect = { select: { id: true, name: true, email: true } } as const;

type DocWithOwner = Prisma.DocumentGetPayload<{ include: { owner: typeof ownerSelect } }>;

function toSummary(doc: DocWithOwner, access: AccessRole): DocSummaryDto {
  return { id: doc.id, title: doc.title, updatedAt: doc.updatedAt, createdAt: doc.createdAt, owner: doc.owner, access };
}

function toDetail(doc: DocWithOwner, access: AccessRole): DocDetailDto {
  return { ...toSummary(doc, access), content: doc.content, version: doc.version };
}

@Injectable()
export class DocumentsService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly access: AccessService,
  ) {}

  async list(userId: string): Promise<DocListDto> {
    const [owned, shares] = await Promise.all([
      this.prisma.document.findMany({
        where: { ownerId: userId },
        include: { owner: ownerSelect },
        orderBy: { updatedAt: 'desc' },
      }),
      this.prisma.documentShare.findMany({
        where: { userId },
        include: { document: { include: { owner: ownerSelect } } },
        orderBy: { document: { updatedAt: 'desc' } },
      }),
    ]);
    return {
      owned: owned.map((d) => toSummary(d, 'owner')),
      shared: shares.map((s) => toSummary(s.document, s.role)),
    };
  }

  async create(userId: string, title: string | undefined, content: Prisma.InputJsonValue = EMPTY_DOC as Prisma.InputJsonValue): Promise<DocDetailDto> {
    const doc = await this.prisma.document.create({
      data: { ownerId: userId, title: title ?? 'Untitled document', content },
      include: { owner: ownerSelect },
    });
    return toDetail(doc, 'owner');
  }

  async get(userId: string, id: string): Promise<DocDetailDto> {
    const role = await this.access.requireAccess(userId, id, ['owner', 'editor', 'viewer']);
    const doc = await this.prisma.document.findUnique({ where: { id }, include: { owner: ownerSelect } });
    if (!doc) throw notFound();
    return toDetail(doc, role);
  }

  async update(userId: string, id: string, dto: UpdateDocumentDto): Promise<DocSavedDto> {
    await this.access.requireAccess(userId, id, ['owner', 'editor']);
    const select = { id: true, title: true, version: true, updatedAt: true } as const;

    if (dto.content === undefined) {
      if (dto.title === undefined) return this.prisma.document.findUniqueOrThrow({ where: { id }, select });
      return this.prisma.document.update({ where: { id }, data: { title: dto.title }, select });
    }

    if (Buffer.byteLength(JSON.stringify(dto.content), 'utf8') > MAX_CONTENT_BYTES) {
      throw new AppError(HttpStatus.PAYLOAD_TOO_LARGE, 'CONTENT_TOO_LARGE', 'Document is too large to save');
    }
    if (!isValidDoc(dto.content)) {
      throw new AppError(HttpStatus.BAD_REQUEST, 'INVALID_CONTENT', 'Document content is not valid');
    }

    // Optimistic concurrency: only writes when the client saw the latest version.
    const { count } = await this.prisma.document.updateMany({
      where: { id, version: dto.baseVersion },
      data: {
        content: dto.content as Prisma.InputJsonValue,
        ...(dto.title !== undefined && { title: dto.title }),
        version: { increment: 1 },
      },
    });
    if (count === 0) {
      const current = await this.prisma.document.findUnique({ where: { id }, select: { version: true } });
      if (!current) throw notFound();
      throw new AppError(HttpStatus.CONFLICT, 'VERSION_CONFLICT', 'This document changed elsewhere.', {
        currentVersion: current.version,
      });
    }
    const saved = await this.prisma.document.findUniqueOrThrow({ where: { id }, select });
    // Report the version this write produced, not one a concurrent save may have bumped since.
    return { ...saved, version: dto.baseVersion! + 1 };
  }

  async remove(userId: string, id: string): Promise<void> {
    await this.access.requireAccess(userId, id, ['owner']);
    await this.prisma.document.delete({ where: { id } });
  }
}
