import { Injectable } from '@nestjs/common';
import * as jwt from 'jsonwebtoken';

export interface WopiTokenPayload {
  fileId: string;
  userId: string;
  canWrite: boolean;
}

@Injectable()
export class WopiTokenService {
  private readonly secret: string;
  private readonly ttlSec: number;

  constructor() {
    this.secret = process.env.WOPI_TOKEN_SECRET ?? 'dev-wopi-secret-change-me';
    this.ttlSec = Number(process.env.WOPI_TOKEN_TTL_SEC ?? 3600);
  }

  issue(fileId: string, userId: string, canWrite: boolean): string {
    const payload: WopiTokenPayload = { fileId, userId, canWrite };
    return jwt.sign(payload, this.secret, { algorithm: 'HS256', expiresIn: this.ttlSec });
  }

  verify(token: string): WopiTokenPayload | null {
    try {
      return jwt.verify(token, this.secret, { algorithms: ['HS256'] }) as WopiTokenPayload;
    } catch {
      return null;
    }
  }
}
