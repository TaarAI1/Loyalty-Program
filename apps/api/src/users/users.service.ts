import { Injectable, ConflictException, NotFoundException } from '@nestjs/common';
import * as bcrypt from 'bcryptjs';
import { PrismaService } from '../prisma/prisma.service';
import { EncryptionService } from '../configuration/encryption.service';

@Injectable()
export class UsersService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly encryption: EncryptionService,
  ) {}

  async findAll() {
    const users = await this.prisma.user.findMany({
      select: { id: true, username: true, role: true, isActive: true, createdAt: true },
      orderBy: { createdAt: 'asc' },
    });
    return users;
  }

  async findOneForAdmin(id: number) {
    const user = await this.prisma.user.findUnique({
      where: { id },
      select: { id: true, username: true, role: true, passwordEncrypted: true },
    });
    if (!user) throw new NotFoundException('User not found');
    return {
      id: user.id,
      username: user.username,
      role: user.role,
      password: user.passwordEncrypted
        ? this.encryption.decryptIfNeeded(user.passwordEncrypted)
        : '',
    };
  }

  async create(username: string, password: string, role: string) {
    const exists = await this.prisma.user.findUnique({ where: { username } });
    if (exists) throw new ConflictException('Username already taken');
    const hash = await bcrypt.hash(password, 10);
    const user = await this.prisma.user.create({
      data: {
        username,
        passwordHash: hash,
        passwordEncrypted: this.encryption.encrypt(password),
        role,
      },
      select: { id: true, username: true, role: true, isActive: true, createdAt: true },
    });
    return user;
  }

  async update(id: number, dto: { username?: string; password?: string; role?: string; isActive?: boolean }) {
    const user = await this.prisma.user.findUnique({ where: { id } });
    if (!user) throw new NotFoundException('User not found');
    if (user.username === 'admin' && dto.username && dto.username !== 'admin') {
      throw new ConflictException('Cannot rename the default admin user');
    }
    const data: Record<string, unknown> = {};
    if (dto.username && dto.username !== user.username) {
      const taken = await this.prisma.user.findUnique({ where: { username: dto.username } });
      if (taken) throw new ConflictException('Username already taken');
      data['username'] = dto.username;
    }
    if (dto.password) {
      data['passwordHash'] = await bcrypt.hash(dto.password, 10);
      data['passwordEncrypted'] = this.encryption.encrypt(dto.password);
    }
    if (dto.role) data['role'] = dto.role;
    if (dto.isActive !== undefined) data['isActive'] = dto.isActive;
    return this.prisma.user.update({
      where: { id },
      data,
      select: { id: true, username: true, role: true, isActive: true, createdAt: true },
    });
  }

  async remove(id: number) {
    const user = await this.prisma.user.findUnique({ where: { id } });
    if (!user) throw new NotFoundException('User not found');
    if (user.username === 'admin') throw new ConflictException('Cannot delete default admin');
    await this.prisma.user.delete({ where: { id } });
    return { success: true };
  }
}
