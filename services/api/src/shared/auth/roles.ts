import { type CanActivate, type ExecutionContext, ForbiddenException, Injectable, SetMetadata } from '@nestjs/common';
import { Reflector } from '@nestjs/core';
import type { MembershipRole } from '../../generated/prisma/enums.js';

export const MIN_ROLE_KEY = 'minRole';

// Requires the caller's membership role to be at least `role`. Use with AccountGuard, after it.
export const MinRole = (role: MembershipRole) => SetMetadata(MIN_ROLE_KEY, role);

const RANK: Record<MembershipRole, number> = { VIEWER: 1, OPERATOR: 2, ADMIN: 3, OWNER: 4 };

@Injectable()
export class RolesGuard implements CanActivate {
  constructor(private readonly reflector: Reflector) {}

  canActivate(context: ExecutionContext): boolean {
    const required = this.reflector.get<MembershipRole | undefined>(MIN_ROLE_KEY, context.getHandler());
    if (!required) return true;
    const role = context.switchToHttp().getRequest().principal?.role as MembershipRole | undefined;
    if (!role || RANK[role] < RANK[required]) throw new ForbiddenException('Insufficient role for this action');
    return true;
  }
}
