import { Injectable } from '@nestjs/common';
import { PassportStrategy } from '@nestjs/passport';
import { Permission } from '@prisma/client';
import { ExtractJwt, Strategy } from 'passport-jwt';

interface JwtPayload {
  sub: string;
  email: string;
  name?: string;
  roleId?: string;
  roleName?: string;   // primary role name (backward-compat singular form)
  roleNames?: string[];
  permissionPolicy: string;
  permissions: Permission[];
}

@Injectable()
export class LocalStrategy extends PassportStrategy(Strategy, 'jwt') {
  constructor() {
    super({
      jwtFromRequest: ExtractJwt.fromAuthHeaderAsBearerToken(),
      secretOrKey: process.env.JWT_SECRET ?? 'dev-secret',
      algorithms: ['HS256'],
    });
  }

  validate(payload: JwtPayload) {
    const roleNames = payload.roleNames ?? (payload.roleName ? [payload.roleName] : []);
    const roleName = payload.roleName ?? roleNames[0] ?? '';
    return {
      sub: payload.sub,
      email: payload.email,
      name: payload.name,
      roleId: payload.roleId,
      roleName,
      roleNames,
      permissionPolicy: payload.permissionPolicy ?? 'DENY_ALL',
      permissions: payload.permissions ?? [],
    };
  }
}
