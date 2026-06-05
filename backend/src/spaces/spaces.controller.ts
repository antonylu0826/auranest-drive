import {
  Body,
  Controller,
  Delete,
  Get,
  HttpCode,
  Param,
  Patch,
  Post,
  Request,
  UseGuards,
} from '@nestjs/common';
import { SpaceRole } from '@prisma/client';
import { JwtAuthGuard } from '../auth/guards/jwt.guard';
import { AdminGuard } from '../auth/guards/admin.guard';
import { SpaceMemberGuard } from '../auth/guards/space-member.guard';
import { RequireSpaceRole } from '../auth/decorators/require-space-role.decorator';
import { ZodValidationPipe } from '../common/pipes/zod-validation.pipe';
import { SpacesService } from './spaces.service';
import { createSpaceSchema, CreateSpaceDto, updateSpaceSchema, UpdateSpaceDto } from './dto/space.dto';
import { addMemberSchema, AddMemberDto, updateMemberSchema, UpdateMemberDto } from './dto/space-member.dto';
import { addRoleGrantSchema, AddRoleGrantDto, updateRoleGrantSchema, UpdateRoleGrantDto } from './dto/space-role-grant.dto';
import { SYSTEM_ADMIN_ROLE } from '../auth/constants';

interface AuthRequest {
  user: { sub: string; roleId?: string; roleName: string };
}

@Controller('spaces')
@UseGuards(JwtAuthGuard)
export class SpacesController {
  constructor(private readonly spacesService: SpacesService) {}

  // ── Space CRUD ────────────────────────────────────────────────────────────

  @Get()
  findAll(@Request() req: AuthRequest) {
    const isAdmin = req.user.roleName === SYSTEM_ADMIN_ROLE;
    return this.spacesService.findAll(req.user.sub, req.user.roleId, isAdmin);
  }

  @Post()
  @UseGuards(AdminGuard)
  create(
    @Request() req: AuthRequest,
    @Body(new ZodValidationPipe(createSpaceSchema)) dto: CreateSpaceDto,
  ) {
    return this.spacesService.create(req.user.sub, dto);
  }

  @Get(':id')
  @UseGuards(SpaceMemberGuard)
  @RequireSpaceRole(SpaceRole.VIEWER, 'space-param')
  findOne(@Param('id') id: string) {
    return this.spacesService.findOne(id);
  }

  @Patch(':id')
  @UseGuards(SpaceMemberGuard)
  @RequireSpaceRole(SpaceRole.OWNER, 'space-param')
  update(
    @Param('id') id: string,
    @Body(new ZodValidationPipe(updateSpaceSchema)) dto: UpdateSpaceDto,
  ) {
    return this.spacesService.update(id, dto);
  }

  @Delete(':id')
  @HttpCode(204)
  @UseGuards(SpaceMemberGuard)
  @RequireSpaceRole(SpaceRole.OWNER, 'space-param')
  remove(@Param('id') id: string) {
    return this.spacesService.remove(id);
  }

  // ── Members ───────────────────────────────────────────────────────────────

  @Get(':id/members')
  @UseGuards(SpaceMemberGuard)
  @RequireSpaceRole(SpaceRole.VIEWER, 'space-param')
  findMembers(@Param('id') spaceId: string) {
    return this.spacesService.findMembers(spaceId);
  }

  @Post(':id/members')
  @UseGuards(SpaceMemberGuard)
  @RequireSpaceRole(SpaceRole.OWNER, 'space-param')
  addMember(
    @Param('id') spaceId: string,
    @Body(new ZodValidationPipe(addMemberSchema)) dto: AddMemberDto,
  ) {
    return this.spacesService.addMember(spaceId, dto);
  }

  @Patch(':id/members/:userId')
  @UseGuards(SpaceMemberGuard)
  @RequireSpaceRole(SpaceRole.OWNER, 'space-param')
  updateMember(
    @Param('id') spaceId: string,
    @Param('userId') userId: string,
    @Body(new ZodValidationPipe(updateMemberSchema)) dto: UpdateMemberDto,
  ) {
    return this.spacesService.updateMember(spaceId, userId, dto);
  }

  @Delete(':id/members/:userId')
  @HttpCode(204)
  @UseGuards(SpaceMemberGuard)
  @RequireSpaceRole(SpaceRole.OWNER, 'space-param')
  removeMember(@Param('id') spaceId: string, @Param('userId') userId: string) {
    return this.spacesService.removeMember(spaceId, userId);
  }

  // ── Role Grants ───────────────────────────────────────────────────────────

  @Get(':id/role-grants')
  @UseGuards(SpaceMemberGuard)
  @RequireSpaceRole(SpaceRole.VIEWER, 'space-param')
  findRoleGrants(@Param('id') spaceId: string) {
    return this.spacesService.findRoleGrants(spaceId);
  }

  @Post(':id/role-grants')
  @UseGuards(SpaceMemberGuard)
  @RequireSpaceRole(SpaceRole.OWNER, 'space-param')
  addRoleGrant(
    @Param('id') spaceId: string,
    @Body(new ZodValidationPipe(addRoleGrantSchema)) dto: AddRoleGrantDto,
  ) {
    return this.spacesService.addRoleGrant(spaceId, dto);
  }

  @Patch(':id/role-grants/:roleId')
  @UseGuards(SpaceMemberGuard)
  @RequireSpaceRole(SpaceRole.OWNER, 'space-param')
  updateRoleGrant(
    @Param('id') spaceId: string,
    @Param('roleId') systemRoleId: string,
    @Body(new ZodValidationPipe(updateRoleGrantSchema)) dto: UpdateRoleGrantDto,
  ) {
    return this.spacesService.updateRoleGrant(spaceId, systemRoleId, dto);
  }

  @Delete(':id/role-grants/:roleId')
  @HttpCode(204)
  @UseGuards(SpaceMemberGuard)
  @RequireSpaceRole(SpaceRole.OWNER, 'space-param')
  removeRoleGrant(@Param('id') spaceId: string, @Param('roleId') systemRoleId: string) {
    return this.spacesService.removeRoleGrant(spaceId, systemRoleId);
  }
}
