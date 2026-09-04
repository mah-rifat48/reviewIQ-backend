import { Controller, Get, Post, Body, Patch, Param, Delete, Query, UseInterceptors, UploadedFile } from '@nestjs/common';
import { ApiTags, ApiOperation, ApiResponse, ApiBearerAuth, ApiConsumes, ApiBody } from '@nestjs/swagger';
import { AdminService } from './admin.service';
import { CreateAdminDto } from './dto/create-admin.dto';
import { UpdateAdminDto } from './dto/update-admin.dto';
import { AdminQueryDto } from './dto/admin-query.dto';
import { UpdateAdminProfileDto } from './dto/update-admin-profile.dto';
import { Roles } from '../../common/decorators/roles.decorator';
import { Role } from '@prisma/client';
import { GetUser } from '../../common/decorators/get-user.decorator';
import { FileInterceptor } from '@nestjs/platform-express';
import { diskStorage } from 'multer';
import { extname } from 'path';
import { Public } from '../../common/decorators/public.decorator';

@ApiTags('Admin')
@ApiBearerAuth()
@Roles(Role.ADMIN, Role.SUPER_ADMIN)
@Controller('admin')
export class AdminController {
  constructor(private readonly adminService: AdminService) {}

  @Public()
  @Post('forgot-password')
  @ApiOperation({ summary: 'Request admin password reset OTP via email' })
  @ApiBody({
    schema: {
      type: 'object',
      properties: { email: { type: 'string', example: 'admin@example.com' } },
      required: ['email'],
    },
  })
  forgotPassword(@Body('email') email: string) {
    return this.adminService.forgotPassword(email);
  }

  @Public()
  @Post('reset-password')
  @ApiOperation({ summary: 'Reset admin password using OTP code' })
  @ApiBody({
    schema: {
      type: 'object',
      properties: {
        email: { type: 'string', example: 'admin@example.com' },
        code: { type: 'string', example: '123456' },
        newPassword: { type: 'string', example: 'NewSecurePass123', minLength: 6 },
      },
      required: ['email', 'code', 'newPassword'],
    },
  })
  resetPassword(
    @Body('email') email: string,
    @Body('code') code: string,
    @Body('newPassword') newPassword: string,
  ) {
    return this.adminService.resetPassword(email, code, newPassword);
  }

  @Get('profile')
  @ApiOperation({ summary: 'Get current admin profile' })
  @ApiResponse({ status: 200, description: 'Return current admin.' })
  getProfile(@GetUser('userId') adminId: string) {
    return this.adminService.findOne(adminId);
  }

  @Patch('profile')
  @UseInterceptors(
    FileInterceptor('image', {
      storage: diskStorage({
        destination: './uploads/profile-images',
        filename: (req, file, cb) => {
          const uniqueSuffix = Date.now() + '-' + Math.round(Math.random() * 1e9);
          cb(null, `${uniqueSuffix}${extname(file.originalname)}`);
        },
      }),
      fileFilter: (req, file, cb) => {
        if (!file.originalname || !file.originalname.match(/\.(jpg|jpeg|png|gif|webp)$/i)) {
          return cb(new Error('Only image files are allowed!'), false);
        }
        cb(null, true);
      },
    }),
  )
  @ApiConsumes('multipart/form-data')
  @ApiOperation({ summary: 'Update current admin profile (including image)' })
  @ApiResponse({ status: 200, description: 'The admin profile has been successfully updated.' })
  updateProfile(
    @GetUser('userId') adminId: string,
    @Body() updateAdminProfileDto: UpdateAdminProfileDto,
    @UploadedFile() file?: Express.Multer.File,
  ) {
    if (file) {
      updateAdminProfileDto.profileImage = `/api/v1/uploads/profile-images/${file.filename}`;
    }
    if ('image' in updateAdminProfileDto) {
      delete updateAdminProfileDto.image;
    }
    return this.adminService.updateProfile(adminId, updateAdminProfileDto);
  }

  @Post()
  @ApiOperation({ summary: 'Create a new admin' })
  @ApiResponse({ status: 201, description: 'The admin has been successfully created.' })
  create(@Body() createAdminDto: CreateAdminDto) {
    return this.adminService.create(createAdminDto);
  }

  @Get()
  @ApiOperation({ summary: 'Get all admins' })
  @ApiResponse({ status: 200, description: 'Return all admins.' })
  findAll(@Query() query: AdminQueryDto) {
    return this.adminService.findAll(query);
  }

  @Get(':id')
  @ApiOperation({ summary: 'Get an admin by id' })
  @ApiResponse({ status: 200, description: 'Return the admin.' })
  findOne(@Param('id') id: string) {
    return this.adminService.findOne(id);
  }

  @Patch(':id')
  @ApiOperation({ summary: 'Update an admin' })
  @ApiResponse({ status: 200, description: 'The admin has been successfully updated.' })
  update(@Param('id') id: string, @Body() updateAdminDto: UpdateAdminDto) {
    return this.adminService.update(id, updateAdminDto);
  }

  @Delete(':id')
  @ApiOperation({ summary: 'Delete an admin' })
  @ApiResponse({ status: 200, description: 'The admin has been successfully deleted.' })
  remove(@Param('id') id: string) {
    return this.adminService.remove(id);
  }
}
