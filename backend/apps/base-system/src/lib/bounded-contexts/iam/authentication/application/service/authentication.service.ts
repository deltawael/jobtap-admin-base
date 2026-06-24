import {
  BadRequestException,
  Inject,
  Injectable,
  NotFoundException,
} from '@nestjs/common';
import { EventPublisher, QueryBus } from '@nestjs/cqrs';
import { JwtService } from '@nestjs/jwt';

import { TokensReadModel } from '@app/base-system/lib/bounded-contexts/iam/tokens/domain/tokens.read.model';
import { TokensByRefreshTokenQuery } from '@app/base-system/lib/bounded-contexts/iam/tokens/queries/tokens.by-refresh_token.query';

import { ISecurityConfig, SecurityConfig } from '@lib/config';
import { CacheConstant } from '@lib/constants/cache.constant';
import { RedisUtility } from '@lib/shared/redis/redis.util';
import { IAuthentication } from '@lib/typings/global';

import { TokenGeneratedEvent } from '../../../tokens/domain/events/token-generated.event';
import { TokensEntity } from '../../../tokens/domain/tokens.entity';
import { UserReadRepoPortToken } from '../../constants';
import { UserLoggedInEvent } from '../../domain/events/user-logged-in.event';
import { User } from '../../domain/user';
import { UserReadRepoPort } from '../../ports/user.read.repo-port';
import { PasswordIdentifierDTO } from '../dto/password-identifier.dto';
import { RefreshTokenDTO } from '../dto/refresh-token.dto';

@Injectable()
export class AuthenticationService {
  constructor(
    private jwtService: JwtService,
    private readonly publisher: EventPublisher,
    @Inject(UserReadRepoPortToken)
    private readonly repository: UserReadRepoPort,
    private queryBus: QueryBus,
    @Inject(SecurityConfig.KEY) private securityConfig: ISecurityConfig,
  ) {}

  async refreshToken(dto: RefreshTokenDTO) {
    const tokenDetails = await this.queryBus.execute<
      TokensByRefreshTokenQuery,
      TokensReadModel | null
    >(new TokensByRefreshTokenQuery(dto.refreshToken));
    if (!tokenDetails) {
      throw new NotFoundException('Refresh token not found.');
    }

    const payload = await this.jwtService.verifyAsync<IAuthentication>(
      tokenDetails.refreshToken,
      {
        secret: this.securityConfig.refreshJwtSecret,
      },
    );

    const tokensAggregate = new TokensEntity(tokenDetails);

    await tokensAggregate.refreshTokenCheck();

    const tokens = await this.generateAccessToken(
      tokensAggregate.userId,
      tokenDetails.username,
      payload.tenantId ?? null,
      payload.actorType ?? this.resolveActorTypeFromTenantId(payload.tenantId ?? null),
    );

    tokensAggregate.apply(
      new TokenGeneratedEvent(
        tokens.token,
        tokens.refreshToken,
        tokensAggregate.userId,
        tokensAggregate.username,
        tokensAggregate.domain,
        dto.ip,
        dto.region,
        dto.userAgent,
        dto.requestId,
        dto.type,
        dto.port,
      ),
    );

    this.publisher.mergeObjectContext(tokensAggregate);
    tokensAggregate.commit();

    return tokens;
  }

  async execPasswordLogin(
    dto: PasswordIdentifierDTO,
  ): Promise<{ token: string; refreshToken: string }> {
    const { identifier, password } = dto;
    const user = await this.repository.findUserByIdentifier(identifier);
    if (!user) {
      throw new NotFoundException('User not found.');
    }
    const userAggregate = new User(user);
    const loginResult = await userAggregate.loginUser(password);

    if (!loginResult.success) {
      throw new BadRequestException(loginResult.message);
    }

    const tenantId = (user as any).tenantId ?? null;
    const actorType = this.resolveActorType(user as any);

    const tokens = await this.generateAccessToken(
      user.id,
      user.username,
      tenantId,
      actorType,
    );

    userAggregate.apply(
      new UserLoggedInEvent(
        user.id,
        user.username,
        tenantId,
        dto.ip,
        dto.address,
        dto.userAgent,
        dto.requestId,
        dto.type,
        dto.port,
      ),
    );
    userAggregate.apply(
      new TokenGeneratedEvent(
        tokens.token,
        tokens.refreshToken,
        user.id,
        user.username,
        user.domain,
        dto.ip,
        dto.address,
        dto.userAgent,
        dto.requestId,
        dto.type,
        dto.port,
      ),
    );
    this.publisher.mergeObjectContext(userAggregate);
    userAggregate.commit();

    const result = await this.repository.findRolesByUserId(user.id);
    const key = `${CacheConstant.AUTH_TOKEN_PREFIX}${user.id}`;
    await RedisUtility.instance.del(key);
    await RedisUtility.instance.sadd(key, ...result);
    await RedisUtility.instance.expire(key, this.securityConfig.jwtExpiresIn);

    return tokens;
  }

  private async generateAccessToken(
    userId: string,
    username: string,
    tenantId: string | null,
    actorType: IAuthentication['actorType'],
  ): Promise<{ token: string; refreshToken: string }> {
    const payload: IAuthentication = {
      uid: userId,
      userId,
      username,
      tenantId,
      actorType,
    };
    const accessToken = await this.jwtService.signAsync(payload);
    const refreshToken = await this.jwtService.signAsync(payload, {
      secret: this.securityConfig.refreshJwtSecret,
      expiresIn: this.securityConfig.refreshJwtExpiresIn,
    });

    return { token: accessToken, refreshToken };
  }

  private resolveActorType(user: any): IAuthentication['actorType'] {
    if (user?.actorType) {
      return user.actorType;
    }
    return this.resolveActorTypeFromTenantId(user?.tenantId ?? null);
  }

  private resolveActorTypeFromTenantId(
    tenantId: string | null,
  ): IAuthentication['actorType'] {
    if (tenantId === null) {
      return 'system_admin';
    }
    return 'tenant_user';
  }
}
