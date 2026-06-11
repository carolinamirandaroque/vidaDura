import { User } from '@prisma/client';
import type { User as UserDto } from '@lifehub/types';

export function toUserDto(user: User): UserDto {
  return {
    id: user.id,
    name: user.name,
    email: user.email,
    avatar: user.avatar,
    timezone: user.timezone,
    createdAt: user.createdAt.toISOString(),
  };
}

export function toUserDtoList(users: User[]): UserDto[] {
  return users.map(toUserDto);
}
