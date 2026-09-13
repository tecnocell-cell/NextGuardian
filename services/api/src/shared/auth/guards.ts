import { type CanActivate, type ExecutionContext, Inject, Injectable, UnauthorizedException } from '@nestjs/common';
import { Database } from '../db/database.js';
import { bearer, resolveAccountPrincipal, resolveDevicePrincipal } from './principal.js';

@Injectable()
export class DeviceGuard implements CanActivate {
  constructor(@Inject(Database) private readonly database: Database) {}
  async canActivate(context: ExecutionContext): Promise<boolean> {
    const request = context.switchToHttp().getRequest();
    const token = bearer(request.headers?.authorization);
    const principal = token ? await resolveDevicePrincipal(this.database.client, token) : null;
    if (!principal) throw new UnauthorizedException('Valid device session required');
    request.principal = principal;
    return true;
  }
}

@Injectable()
export class AccountGuard implements CanActivate {
  constructor(@Inject(Database) private readonly database: Database) {}
  async canActivate(context: ExecutionContext): Promise<boolean> {
    const request = context.switchToHttp().getRequest();
    const token = bearer(request.headers?.authorization);
    const principal = token ? await resolveAccountPrincipal(this.database.client, token) : null;
    if (!principal) throw new UnauthorizedException('Valid account session required');
    request.principal = principal;
    return true;
  }
}

// Accepts a device OR account bearer; tries device first, then account.
@Injectable()
export class AccountOrDeviceGuard implements CanActivate {
  constructor(@Inject(Database) private readonly database: Database) {}
  async canActivate(context: ExecutionContext): Promise<boolean> {
    const request = context.switchToHttp().getRequest();
    const token = bearer(request.headers?.authorization);
    if (!token) throw new UnauthorizedException('Session required');
    const principal =
      (await resolveDevicePrincipal(this.database.client, token)) ??
      (await resolveAccountPrincipal(this.database.client, token));
    if (!principal) throw new UnauthorizedException('Session required');
    request.principal = principal;
    return true;
  }
}
