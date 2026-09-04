import { Controller, Get, Body, Patch } from '@nestjs/common';
import { ApiTags, ApiOperation, ApiResponse, ApiBearerAuth } from '@nestjs/swagger';
import { SystemService } from './system.service';
import { UpdateSystemDto } from './dto/update-system.dto';
import { Roles } from '../../common/decorators/roles.decorator';
import { Role } from '@prisma/client';
import { Public } from 'src/common/decorators/public.decorator';

@ApiTags('System')
@ApiBearerAuth()
@Controller('system')
export class SystemController {
  constructor(private readonly systemService: SystemService) { }

  @Public()
  @Get()
  @ApiOperation({ summary: 'Get system settings' })
  @ApiResponse({ status: 200, description: 'Return system settings.' })
  getSettings() {
    return this.systemService.getSystemSettings();
  }

  @Patch()
  @Roles(Role.ADMIN, Role.SUPER_ADMIN)
  @ApiOperation({ summary: 'Update system settings' })
  @ApiResponse({ status: 200, description: 'The settings have been successfully updated.' })
  update(@Body() updateSystemDto: UpdateSystemDto) {
    return this.systemService.updateSystemSettings(updateSystemDto);
  }
}
