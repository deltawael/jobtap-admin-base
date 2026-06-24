import { Inject, Injectable, UnauthorizedException } from '@nestjs/common';
import { PassportStrategy } from '@nestjs/passport';
import { ExtractJwt, Strategy } from 'passport-jwt';

import { ISecurityConfig, SecurityConfig } from '@lib/config';
import { IAuthentication } from '@lib/typings/global';

@Injectable()
export class JwtStrategy extends PassportStrategy(Strategy, 'jwt') {
  constructor(
    @Inject(SecurityConfig.KEY)
    private readonly securityConfig: ISecurityConfig,
  ) {
    super({
      jwtFromRequest: ExtractJwt.fromAuthHeaderAsBearerToken(),
      ignoreExpiration: false,
      secretOrKey: securityConfig.jwtSecret,
    });
  }

  async validate(payload: any) {
    return this.validateAuthenticationPayload(payload);
  }

  assertIsIAuthentication(payload: any): asserts payload is IAuthentication {
    if (typeof payload.uid !== 'string' && typeof payload.userId !== 'string') {
      throw new UnauthorizedException('Invalid user id');
    }
    if (typeof payload.username !== 'string') {
      throw new UnauthorizedException('Invalid username');
    }
    if (
      payload.tenantId !== null &&
      payload.tenantId !== undefined &&
      typeof payload.tenantId !== 'string'
    ) {
      throw new UnauthorizedException('Invalid tenant id');
    }
    if (
      payload.actorType !== 'system_admin' &&
      payload.actorType !== 'tenant_admin' &&
      payload.actorType !== 'tenant_user'
    ) {
      throw new UnauthorizedException('Invalid actor type');
    }
  }

  async validateAuthenticationPayload(payload: any): Promise<IAuthentication> {
    this.assertIsIAuthentication(payload);
    return {
      uid: payload.uid ?? payload.userId,
      userId: payload.userId ?? payload.uid,
      username: payload.username,
      tenantId: payload.tenantId ?? null,
      actorType: payload.actorType,
    };
  }
}
