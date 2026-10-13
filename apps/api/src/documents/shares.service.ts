import { HttpStatus, Injectable } from '@nestjs/common';
import { Prisma } from '@prisma/client';
import { AccessService } from '../access/access.service';
import { AppError } from '../common/app-error';
import { PrismaService } from '../prisma/prisma.service';
import { CreateShareDto, ShareDto, ShareListDto } from './documents.dto';

type ShareWithUser = Prisma.DocumentShareGetPayload<{ include: { user: true } }>;

const toShare = (s: ShareWithUser): ShareDto => ({
  userId: s.userId,
  name: s.user.name,
  email: s.user.email,
  role: s.role,
  createdAt: s.createdAt,
});

@Injectable()
export class SharesService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly access: AccessService,
  ) {}

  async list(userId: string, docId: string): Promise<ShareListDto> {
    await this.access.requireAccess(userId, docId, ['owner']);
    const doc = await this.prisma.document.findUniqueOrThrow({
      where: { id: docId },
      select: {
        owner: { select: { id: true, name: true, email: true } },
        shares: { include: { user: true }, orderBy: { createdAt: 'asc' } },
      },
    });
    return { owner: doc.owner, shares: doc.shares.map(toShare) };
  }

  async create(userId: string, docId: string, dto: CreateShareDto): Promise<ShareDto> {
    await this.access.requireAccess(userId, docId, ['owner']);
    const target = await this.prisma.user.findUnique({ where: { email: dto.email } });
    if (!target) throw new AppError(HttpStatus.NOT_FOUND, 'USER_NOT_FOUND', 'No user with that email');
    if (target.id === userId) {
      throw new AppError(HttpStatus.UNPROCESSABLE_ENTITY, 'SELF_SHARE', 'You already own this document');
    }
    try {
      const share = await this.prisma.documentShare.create({
        data: { documentId: docId, userId: target.id, role: dto.role ?? 'editor' },
        include: { user: true },
      });
      return toShare(share);
    } catch (e) {
      if (e instanceof Prisma.PrismaClientKnownRequestError && e.code === 'P2002') {
        throw new AppError(HttpStatus.CONFLICT, 'ALREADY_SHARED', `Already shared with ${target.name}`);
      }
      throw e;
    }
  }

  async remove(userId: string, docId: string, targetUserId: string): Promise<void> {
    await this.access.requireAccess(userId, docId, ['owner']);
    const { count } = await this.prisma.documentShare.deleteMany({ where: { documentId: docId, userId: targetUserId } });
    if (count === 0) throw new AppError(HttpStatus.NOT_FOUND, 'NOT_FOUND', 'Share not found.');
  }
}
