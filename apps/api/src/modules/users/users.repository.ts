import { Injectable } from '@nestjs/common';
import { PrismaService } from '../../infrastructure/prisma/prisma.service';
import { UpdateUserDto } from './dto/update-user.dto';

@Injectable()
export class UsersRepository {
  constructor(private prisma: PrismaService) {}

  findById(id: string) {
    return this.prisma.user.findUnique({ where: { id } });
  }

  findByEmail(email: string) {
    return this.prisma.user.findUnique({ where: { email } });
  }

  search(query: string, excludeId?: string) {
    return this.prisma.user.findMany({
      where: {
        AND: [
          excludeId ? { id: { not: excludeId } } : {},
          {
            OR: [
              { name: { contains: query, mode: 'insensitive' } },
              { email: { contains: query, mode: 'insensitive' } },
            ],
          },
        ],
      },
      take: 20,
    });
  }

  update(id: string, dto: UpdateUserDto) {
    return this.prisma.user.update({ where: { id }, data: dto });
  }
}
