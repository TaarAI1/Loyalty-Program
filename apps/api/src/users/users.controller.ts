import {
  Controller, Get, Post, Patch, Delete, Body, Param, ParseIntPipe, UseGuards,
} from '@nestjs/common';
import { IsString, MinLength, IsIn, IsOptional, IsBoolean } from 'class-validator';
import { UsersService } from './users.service';
import { Roles } from '../auth/roles.decorator';
import { RolesGuard } from '../auth/roles.guard';

class CreateUserDto {
  @IsString() username!: string;
  @IsString() @MinLength(6) password!: string;
  @IsIn(['admin', 'user']) role!: string;
}

class UpdateUserDto {
  @IsOptional() @IsString() @MinLength(6) password?: string;
  @IsOptional() @IsIn(['admin', 'user']) role?: string;
  @IsOptional() @IsBoolean() isActive?: boolean;
}

@UseGuards(RolesGuard)
@Roles('admin')
@Controller('users')
export class UsersController {
  constructor(private readonly usersService: UsersService) {}

  @Get()
  findAll() {
    return this.usersService.findAll();
  }

  @Post()
  create(@Body() dto: CreateUserDto) {
    return this.usersService.create(dto.username, dto.password, dto.role);
  }

  @Patch(':id')
  update(@Param('id', ParseIntPipe) id: number, @Body() dto: UpdateUserDto) {
    return this.usersService.update(id, dto);
  }

  @Delete(':id')
  remove(@Param('id', ParseIntPipe) id: number) {
    return this.usersService.remove(id);
  }
}
