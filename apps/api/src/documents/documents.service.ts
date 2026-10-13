import { HttpStatus, Injectable } from '@nestjs/common';
import { Prisma } from '@prisma/client';
import { AccessRole, AccessService } from '../access/access.service';
import { AppError, notFound } from '../common/app-error';
import { EMPTY_DOC, isValidDoc } from '../editor/extensions';
import { PrismaService } from '../prisma/prisma.service';
import { DocDetailDto, DocListDto, DocSavedDto, DocSummaryDto, UpdateDocumentDto } from './documents.dto';

export const MAX_CONTENT_BYTES = 1024 * 1024;
export const DEFAULT_PAGE_SIZE = 50;

interface CursorPos {
  list: 'owned' | 'shared';
  updatedAt: Date;
  id: string;
}

const UUID_RE = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;

function encodeCursor(list: CursorPos['list'], doc: { updatedAt: Date; id: string }): string {
  return Buffer.from(JSON.stringify({ l: list, u: doc.updatedAt.toISOString(), i: doc.id })).toString('base64url');
}

// Opaque cursor -> position; anything malformed is a 400.
function decodeCursor(cursor: string): CursorPos {
  try {
    const raw = JSON.parse(Buffer.from(cursor, 'base64url').toString('utf8')) as { l?: unknown; u?: unknown; i?: unknown };
    const updatedAt = new Date(String(raw.u));
    if ((raw.l === 'owned' || raw.l === 'shared') && !isNaN(updatedAt.getTime()) && UUID_RE.test(String(raw.i))) {
      return { list: raw.l, updatedAt, id: String(raw.i) };
    }
  } catch {
    // fall through
  }
  throw new AppError(HttpStatus.BAD_REQUEST, 'VALIDATION_ERROR', 'Invalid cursor', { details: ['Invalid cursor'] });
}

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

  // Keyset pagination on (updatedAt desc, id desc); a cursor pages only its own list.
  async list(userId: string, limit = DEFAULT_PAGE_SIZE, cursor?: string): Promise<DocListDto> {
    const pos = cursor ? decodeCursor(cursor) : undefined;
    const wantOwned = !pos || pos.list === 'owned';
    const wantShared = !pos || pos.list === 'shared';
    const after = (p?: CursorPos): Prisma.DocumentWhereInput =>
      p ? { OR: [{ updatedAt: { lt: p.updatedAt } }, { updatedAt: p.updatedAt, id: { lt: p.id } }] } : {};

    const [owned, shares] = await Promise.all([
      wantOwned
        ? this.prisma.document.findMany({
            where: { ownerId: userId, ...after(pos) },
            include: { owner: ownerSelect },
            orderBy: [{ updatedAt: 'desc' }, { id: 'desc' }],
            take: limit + 1,
          })
        : [],
      wantShared
        ? this.prisma.documentShare.findMany({
            where: { userId, document: after(pos) },
            include: { document: { include: { owner: ownerSelect } } },
            orderBy: [{ document: { updatedAt: 'desc' } }, { documentId: 'desc' }],
            take: limit + 1,
          })
        : [],
    ]);

    const ownedPage = owned.slice(0, limit);
    const sharedPage = shares.slice(0, limit);
    const last = <T>(arr: T[]): T => arr[arr.length - 1];
    return {
      owned: ownedPage.map((d) => toSummary(d, 'owner')),
      shared: sharedPage.map((s) => toSummary(s.document, s.role)),
      nextCursor: {
        owned: owned.length > limit ? encodeCursor('owned', last(ownedPage)) : null,
        shared: shares.length > limit ? encodeCursor('shared', last(sharedPage).document) : null,
      },
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
