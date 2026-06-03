import { CanActivate, ExecutionContext, Injectable, UnauthorizedException } from '@nestjs/common';
import type { Request } from 'express';
import { WopiTokenService } from './wopi-token.service';

declare module 'express' {
  interface Request {
    wopi?: { fileId: string; userId: string; canWrite: boolean };
  }
}

@Injectable()
export class WopiTokenGuard implements CanActivate {
  constructor(private readonly wopiToken: WopiTokenService) {}

  canActivate(context: ExecutionContext): boolean {
    const req = context.switchToHttp().getRequest<Request>();
    const token = req.query['access_token'] as string | undefined;
    if (!token) throw new UnauthorizedException('WOPI access token required');

    const payload = this.wopiToken.verify(token);
    if (!payload) throw new UnauthorizedException('Invalid or expired WOPI token');

    const routeFileId = req.params['fileId'];
    if (routeFileId && payload.fileId !== routeFileId) {
      throw new UnauthorizedException('Token fileId does not match requested resource');
    }

    req.wopi = payload;
    return true;
  }
}
