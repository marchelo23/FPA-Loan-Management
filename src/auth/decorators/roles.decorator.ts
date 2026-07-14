import { SetMetadata } from '@nestjs/common';
import { UserRole } from '../../common/entities/user.entity';

export const Roles = (...roles: UserRole[]) => SetMetadata('roles', roles);
