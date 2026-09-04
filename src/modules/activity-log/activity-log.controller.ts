import { Controller, Get, Post, Body, Patch, Param, Delete, Query } from '@nestjs/common';
import { ApiTags, ApiOperation, ApiResponse, ApiBearerAuth } from '@nestjs/swagger';
import { ActivityLogService } from './activity-log.service';
import { CreateActivityLogDto } from './dto/create-activity-log.dto';
import { UpdateActivityLogDto } from './dto/update-activity-log.dto';
import { ActivityLogQueryDto } from './dto/activity-log-query.dto';
import { Roles } from '../../common/decorators/roles.decorator';
import { Role } from '@prisma/client';

@ApiTags('Activity Log')
@ApiBearerAuth()
@Roles(Role.ADMIN, Role.SUPER_ADMIN)
@Controller('activity-log')
export class ActivityLogController {
  constructor(private readonly activityLogService: ActivityLogService) {}

  @Post()
  @ApiOperation({ summary: 'Create a new activity log' })
  @ApiResponse({ status: 201, description: 'The log has been successfully created.' })
  create(@Body() createActivityLogDto: CreateActivityLogDto) {
    return this.activityLogService.create(createActivityLogDto);
  }

  @Get()
  @ApiOperation({ summary: 'Get all activity logs' })
  @ApiResponse({ status: 200, description: 'Return all logs.' })
  findAll(@Query() query: ActivityLogQueryDto) {
    return this.activityLogService.findAll(query);
  }

  @Get(':id')
  @ApiOperation({ summary: 'Get an activity log by id' })
  @ApiResponse({ status: 200, description: 'Return the log.' })
  findOne(@Param('id') id: string) {
    return this.activityLogService.findOne(id);
  }

  @Patch(':id')
  @ApiOperation({ summary: 'Update an activity log' })
  @ApiResponse({ status: 200, description: 'The log has been successfully updated.' })
  update(@Param('id') id: string, @Body() updateActivityLogDto: UpdateActivityLogDto) {
    return this.activityLogService.update(id, updateActivityLogDto);
  }

  @Delete(':id')
  @ApiOperation({ summary: 'Delete an activity log' })
  @ApiResponse({ status: 200, description: 'The log has been successfully deleted.' })
  remove(@Param('id') id: string) {
    return this.activityLogService.remove(id);
  }
}
