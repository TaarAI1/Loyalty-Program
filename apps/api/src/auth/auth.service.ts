import { Injectable, UnauthorizedException } from '@nestjs/common';
import { JwtService } from '@nestjs/jwt';
import * as bcrypt from 'bcryptjs';
import { PrismaService } from '../prisma/prisma.service';

@Injectable()
export class AuthService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly jwt: JwtService,
  ) {}

  async login(username: string, password: string) {
    const user = await this.prisma.user.findUnique({ where: { username } });
    if (!user || !user.isActive) throw new UnauthorizedException('Invalid credentials');

    const valid = await bcrypt.compare(password, user.passwordHash);
    if (!valid) throw new UnauthorizedException('Invalid credentials');

    const payload = { sub: user.id, username: user.username, role: user.role };
    const token = this.jwt.sign(payload);
    return {
      access_token: token,
      user: { id: user.id, username: user.username, role: user.role },
    };
  }

  async seedDefaultAdmin() {
    const exists = await this.prisma.user.findUnique({ where: { username: 'admin' } });
    if (!exists) {
      const hash = await bcrypt.hash('admin123', 10);
      await this.prisma.user.create({
        data: { username: 'admin', passwordHash: hash, role: 'admin' },
      });
    }
  }
}
