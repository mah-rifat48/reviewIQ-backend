import {
  Controller,
  Get,
  Post,
  Patch,
  Delete,
  Param,
  Query,
  Body,
  UseInterceptors,
  UploadedFile,
} from '@nestjs/common';
import { ApiTags, ApiOperation, ApiResponse, ApiBearerAuth, ApiConsumes, ApiBody } from '@nestjs/swagger';
import { UsersService } from './users.service';
import { UserQueryDto } from './dto/user-query.dto';
import { UpdateProfileDto } from './dto/update-profile.dto';
import { UpdateNotificationSettingsDto } from './dto/update-notification-settings.dto';
import { Roles } from '../../common/decorators/roles.decorator';
import { Role } from '@prisma/client';
import { GetUser } from '../../common/decorators/get-user.decorator';
import { FileInterceptor } from '@nestjs/platform-express';
import { diskStorage } from 'multer';
import { extname } from 'path';

@ApiTags('Users')
@ApiBearerAuth()
@Roles(Role.USER, Role.ADMIN, Role.SUPER_ADMIN)
@Controller('users')
export class UsersController {
  constructor(private readonly usersService: UsersService) { }

  @Get('profile')
  @ApiOperation({ summary: 'Get current user profile' })
  @ApiResponse({ status: 200, description: 'Return current user.' })
  getProfile(@GetUser('userId') userId: string) {
    return this.usersService.findOne(userId);
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
  @ApiOperation({ summary: 'Update current user profile (including image)' })
  @ApiResponse({ status: 200, description: 'The profile has been successfully updated.' })
  updateProfile(
    @GetUser('userId') userId: string,
    @Body() updateProfileDto: UpdateProfileDto,
    @UploadedFile() file?: Express.Multer.File,
  ) {
    if (file) {
      updateProfileDto.profileImage = `/api/v1/uploads/profile-images/${file.filename}`;
    }
    if ('image' in updateProfileDto) {
      delete updateProfileDto.image;
    }
    return this.usersService.update(userId, updateProfileDto);
  }

  @Get('notification-settings')
  @ApiOperation({ summary: 'Get current user notification settings' })
  @ApiResponse({ status: 200, description: 'Return notification settings.' })
  getNotificationSettings(@GetUser('userId') userId: string) {
    return this.usersService.getNotificationSettings(userId);
  }

  @Patch('notification-settings')
  @ApiOperation({ summary: 'Update current user notification settings' })
  @ApiResponse({ status: 200, description: 'The notification settings have been successfully updated.' })
  updateNotificationSettings(
    @GetUser('userId') userId: string,
    @Body() updateSettingsDto: UpdateNotificationSettingsDto,
  ) {
    return this.usersService.updateNotificationSettings(userId, updateSettingsDto);
  }

  @Get()
  @Roles(Role.ADMIN, Role.SUPER_ADMIN)
  @ApiOperation({ summary: 'Get all users' })
  @ApiResponse({ status: 200, description: 'Return all users.' })
  findAll(@Query() query: UserQueryDto) {
    return this.usersService.findAll(query);
  }

  @Get('statistics')
  @Roles(Role.ADMIN, Role.SUPER_ADMIN)
  @ApiOperation({ summary: 'Get user management statistics' })
  @ApiResponse({ status: 200, description: 'Returns management metrics about users.' })
  getStatistics() {
    return this.usersService.getStatistics();
  }

  @Delete('me')
  @ApiOperation({ summary: 'Delete current user account' })
  @ApiResponse({ status: 200, description: 'The account has been successfully deleted.' })
  @ApiResponse({ status: 409, description: 'Cannot delete account with existing relations.' })
  deleteMyAccount(@GetUser('userId') userId: string) {
    return this.usersService.deleteMyAccount(userId);
  }

  @Get(':id')
  @Roles(Role.USER, Role.ADMIN, Role.SUPER_ADMIN)
  @ApiOperation({ summary: 'Get a user by id' })
  @ApiResponse({ status: 200, description: 'Return the user.' })
  findOne(@Param('id') id: string) {
    return this.usersService.findOne(id);
  }

  @Delete(':id')
  @Roles(Role.ADMIN, Role.SUPER_ADMIN)
  @ApiOperation({ summary: 'Delete a user' })
  @ApiResponse({ status: 200, description: 'The user has been successfully deleted.' })
  remove(@Param('id') id: string) {
    return this.usersService.remove(id);
  }

  @Patch(':id/suspend')
  @Roles(Role.ADMIN, Role.SUPER_ADMIN)
  @ApiOperation({ summary: 'Suspend or unsuspend a user' })
  @ApiResponse({ status: 200, description: 'The user status has been updated.' })
  @ApiBody({
    schema: {
      type: 'object',
      properties: {
        suspend: { type: 'boolean', example: true, description: 'true = suspend, false = unsuspend' },
      },
      required: ['suspend'],
    },
  })
  suspend(@Param('id') id: string, @Body('suspend') suspend: boolean) {
    return this.usersService.suspend(id, suspend);
  }
}

