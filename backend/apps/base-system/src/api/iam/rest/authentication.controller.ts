import { Body, Controller, Get, Post, Request } from '@nestjs/common';
import { ApiOperation, ApiTags } from '@nestjs/swagger';
import { FastifyRequest } from 'fastify';

import { PasswordIdentifierDTO } from '@app/base-system/lib/bounded-contexts/iam/authentication/application/dto/password-identifier.dto';
import { RefreshTokenDTO } from '@app/base-system/lib/bounded-contexts/iam/authentication/application/dto/refresh-token.dto';
import { AuthenticationService } from '@app/base-system/lib/bounded-contexts/iam/authentication/application/service/authentication.service';

import { USER_AGENT } from '@lib/constants/rest.constant';
import { Public } from '@lib/infra/decorators/public.decorator';
import { ApiRes } from '@lib/infra/rest/res.response';
import { Ip2regionService } from '@lib/shared/ip2region/ip2region.service';
import { PrismaService } from '@lib/shared/prisma/prisma.service';
import { IAuthentication } from '@lib/typings/global';
import { getClientIpAndPort } from '@lib/utils/ip.util';

import { PasswordLoginDto } from '../dto/password-login.dto';

@ApiTags('Authentication - Module')
@Controller('auth')
export class AuthenticationController {
  constructor(
    private readonly authenticationService: AuthenticationService,
    private readonly prisma: PrismaService,
  ) {}

  @Public()
  @Post('login')
  @ApiOperation({
    summary: 'Password-based User Authentication',
    description:
      'Authenticates a user by verifying provided password credentials and issues a JSON Web Token (JWT) upon successful authentication.',
  })
  async login(
    @Body() dto: PasswordLoginDto,
    @Request() request: FastifyRequest,
  ): Promise<ApiRes<any>> {
    const { ip, port } = getClientIpAndPort(request);
    let region = 'Unknown';

    try {
      const ip2regionResult = await Ip2regionService.getSearcher().search(ip);
      region = ip2regionResult.region || region;
    } catch (_) {}
    const token = await this.authenticationService.execPasswordLogin(
      new PasswordIdentifierDTO(
        dto.identifier,
        dto.password,
        ip,
        region,
        request.headers[USER_AGENT] ?? '',
        'TODO',
        'PC',
        port,
      ),
    );
    return ApiRes.success(token);
  }

  @Public()
  @Post('refreshToken')
  async refreshToken(
    @Body('refreshToken') refreshToken: string,
    @Request() request: FastifyRequest,
  ): Promise<ApiRes<any>> {
    const { ip, port } = getClientIpAndPort(request);
    let region = 'Unknown';

    try {
      const ip2regionResult = await Ip2regionService.getSearcher().search(ip);
      region = ip2regionResult.region || region;
    } catch (_) {}
    const token = await this.authenticationService.refreshToken(
      new RefreshTokenDTO(
        refreshToken,
        ip,
        region,
        request.headers[USER_AGENT] ?? '',
        'TODO',
        'PC',
        port,
      ),
    );
    return ApiRes.success(token);
  }

  @Get('getUserInfo')
  async getProfile(@Request() req: any): Promise<ApiRes<any>> {
    const user = req.user as IAuthentication;
    const userRoleMappings = await this.prisma.sysUserRole.findMany({ where: { userId: user.userId } });
    const roleIds = userRoleMappings.map(item => item.roleId);
    const roles = roleIds.length ? await this.prisma.sysRole.findMany({ where: { id: { in: roleIds } } }) : [];
    const templateIds = roles.map(item => item.templateId).filter(Boolean) as string[];
    const now = new Date();
    const [roleCapabilities, templateCapabilities, overrides, delegations] = await Promise.all([
      roleIds.length ? this.prisma.roleCapability.findMany({ where: { roleId: { in: roleIds } } }) : Promise.resolve([]),
      templateIds.length
        ? this.prisma.roleTemplateCapability.findMany({ where: { templateId: { in: templateIds } } })
        : Promise.resolve([]),
      this.prisma.userScopeOverride.findMany({ where: { userId: user.userId } }),
      this.prisma.delegation.findMany({
        where: {
          toUserId: user.userId,
          status: 'active',
          startAt: { lte: now },
          endAt: { gte: now }
        }
      })
    ]);

    const capabilityIds = [
      ...new Set([
        ...roleCapabilities.map(item => item.capabilityId),
        ...templateCapabilities.map(item => item.capabilityId),
        ...overrides.map(item => item.capabilityId),
        ...delegations.map(item => item.capabilityId)
      ])
    ];

    const capabilities = capabilityIds.length
      ? await this.prisma.capability.findMany({ where: { id: { in: capabilityIds } }, orderBy: { code: 'asc' } })
      : [];

    const viewCapabilities = capabilities.filter(item => item.kind === 'view');
    const visibleViews = viewCapabilities.length
      ? await this.prisma.capabilityViewBinding.findMany({
          where: { capabilityId: { in: viewCapabilities.map(item => item.id) } },
          orderBy: [{ resourceType: 'asc' }, { viewKey: 'asc' }]
        })
      : [];

    return ApiRes.success({
      userId: user.userId,
      userName: user.username,
      tenantId: user.tenantId,
      actorType: user.actorType,
      roles: roles.map(item => item.code),
      capabilities: capabilities.map(item => item.code),
      visibleViews: visibleViews.map(item => ({
        capabilityId: item.capabilityId,
        capabilityCode: viewCapabilities.find(capability => capability.id === item.capabilityId)?.code ?? null,
        resourceType: item.resourceType,
        viewKey: item.viewKey,
      })),
    });
  }
}