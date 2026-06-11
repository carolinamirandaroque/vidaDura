import {
  Injectable,
  UnauthorizedException,
  ConflictException,
  BadRequestException,
} from '@nestjs/common';
import { JwtService } from '@nestjs/jwt';
import { ConfigService } from '@nestjs/config';
import * as bcrypt from 'bcrypt';
import { randomBytes } from 'crypto';
import { PrismaService } from '../../infrastructure/prisma/prisma.service';
import { toUserDto } from '../../common/mappers/user.mapper';
import { LoginDto } from './dto/login.dto';
import { RegisterDto } from './dto/register.dto';
import { GoogleProfile } from './strategies/google.strategy';
import type { AuthTokens, User } from '@lifehub/types';

@Injectable()
export class AuthService {
  constructor(
    private prisma: PrismaService,
    private jwtService: JwtService,
    private configService: ConfigService,
  ) {}

  async register(dto: RegisterDto): Promise<{ user: User; tokens: AuthTokens }> {
    const existing = await this.prisma.user.findUnique({ where: { email: dto.email } });
    if (existing) throw new ConflictException('Email already registered');

    const hashedPassword = await bcrypt.hash(dto.password, 12);
    const user = await this.prisma.$transaction(async (tx) => {
      const created = await tx.user.create({
        data: {
          name: dto.name,
          email: dto.email,
          password: hashedPassword,
          timezone: dto.timezone ?? 'Europe/Lisbon',
        },
      });
      await tx.calendar.create({
        data: {
          name: 'Pessoal',
          color: '#6366f1',
          description: 'Calendário pessoal',
          ownerId: created.id,
          members: { create: { userId: created.id, role: 'owner' } },
        },
      });
      return created;
    });

    const tokens = await this.generateTokens(user.id, user.email);
    return { user: toUserDto(user), tokens };
  }

  async login(dto: LoginDto): Promise<{ user: User; tokens: AuthTokens }> {
    const user = await this.prisma.user.findUnique({ where: { email: dto.email } });
    if (!user || !user.password) throw new UnauthorizedException('Invalid credentials');

    const valid = await bcrypt.compare(dto.password, user.password);
    if (!valid) throw new UnauthorizedException('Invalid credentials');

    const tokens = await this.generateTokens(user.id, user.email);
    return { user: toUserDto(user), tokens };
  }

  async googleLogin(profile: GoogleProfile): Promise<{ user: User; tokens: AuthTokens }> {
    let user = await this.prisma.user.findFirst({
      where: { OR: [{ googleId: profile.googleId }, { email: profile.email }] },
    });

    if (user) {
      user = await this.prisma.user.update({
        where: { id: user.id },
        data: {
          googleId: profile.googleId,
          avatar: profile.avatar ?? user.avatar,
          name: user.name || profile.name,
        },
      });
    } else {
      user = await this.prisma.user.create({
        data: {
          name: profile.name,
          email: profile.email,
          googleId: profile.googleId,
          avatar: profile.avatar,
        },
      });
    }

    const tokens = await this.generateTokens(user.id, user.email);
    return { user: toUserDto(user), tokens };
  }

  async refreshToken(token: string): Promise<AuthTokens> {
    const stored = await this.prisma.refreshToken.findUnique({ where: { token } });
    if (!stored || stored.expiresAt < new Date()) {
      throw new UnauthorizedException('Invalid refresh token');
    }

    const user = await this.prisma.user.findUnique({ where: { id: stored.userId } });
    if (!user) throw new UnauthorizedException('User not found');

    await this.prisma.refreshToken.delete({ where: { id: stored.id } });
    return this.generateTokens(user.id, user.email);
  }

  async logout(refreshToken: string): Promise<void> {
    await this.prisma.refreshToken.deleteMany({ where: { token: refreshToken } });
  }

  private async generateTokens(userId: string, email: string): Promise<AuthTokens> {
    const payload = { sub: userId, email };

    const accessToken = this.jwtService.sign(payload, {
      secret: this.configService.get<string>('JWT_SECRET'),
      expiresIn: this.configService.get<string>('JWT_EXPIRATION', '15m'),
    });

    const refreshToken = randomBytes(64).toString('hex');
    const expiresIn = this.configService.get<string>('JWT_REFRESH_EXPIRATION', '7d');
    const expiresAt = new Date();
    const days = parseInt(expiresIn.replace('d', ''), 10) || 7;
    expiresAt.setDate(expiresAt.getDate() + days);

    await this.prisma.refreshToken.create({
      data: { token: refreshToken, userId, expiresAt },
    });

    return { accessToken, refreshToken };
  }
}
