import { Injectable, NotFoundException } from '@nestjs/common';
import { UsersRepository } from './users.repository';
import { toUserDto } from '../../common/mappers/user.mapper';
import { UpdateUserDto } from './dto/update-user.dto';

@Injectable()
export class UsersService {
  constructor(private usersRepo: UsersRepository) {}

  async getProfile(userId: string) {
    const user = await this.usersRepo.findById(userId);
    if (!user) throw new NotFoundException('User not found');
    return toUserDto(user);
  }

  async updateProfile(userId: string, dto: UpdateUserDto) {
    const user = await this.usersRepo.update(userId, dto);
    return toUserDto(user);
  }

  async searchUsers(query: string, currentUserId: string) {
    const users = await this.usersRepo.search(query, currentUserId);
    return users.map(toUserDto);
  }
}
