import { Global, Injectable, Module } from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';
import { forbidden, notFound } from '../common/app-error';

export type AccessRole = 'owner' | 'editor' | 'viewer';

const UUID_RE = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;

// Single source of truth for document permissions.
@Injectable()
export class AccessService {
  constructor(private readonly prisma: PrismaService) {}

  async getDocumentAccess(userId: string, docId: string): Promise<AccessRole | null> {
    if (!UUID_RE.test(docId) || !UUID_RE.test(userId)) return null;
    const doc = await this.prisma.document.findUnique({
      where: { id: docId },
      select: { ownerId: true, shares: { where: { userId }, select: { role: true } } },
    });
    if (!doc) return null;
    if (doc.ownerId === userId) return 'owner';
    return doc.shares[0]?.role ?? null;
  }

  // No access -> 404 (no probing); wrong role -> 403.
  async requireAccess(userId: string, docId: string, allowed: AccessRole[]): Promise<AccessRole> {
    const role = await this.getDocumentAccess(userId, docId);
    if (!role) throw notFound();
    if (!allowed.includes(role)) throw forbidden();
    return role;
  }
}

@Global()
@Module({ providers: [AccessService], exports: [AccessService] })
export class AccessModule {}
