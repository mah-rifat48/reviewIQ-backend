import { Controller, Get, Post, Body, Patch, Param, Delete, Query } from '@nestjs/common';
import { ApiTags, ApiOperation, ApiResponse, ApiBearerAuth } from '@nestjs/swagger';
import { CardInfoService } from './card-info.service';
import { CreateCardInfoDto } from './dto/create-card-info.dto';
import { UpdateCardInfoDto } from './dto/update-card-info.dto';
import { CardInfoQueryDto } from './dto/card-info-query.dto';
import { Roles } from '../../common/decorators/roles.decorator';
import { Role } from '@prisma/client';
import { GetUser } from '../../common/decorators/get-user.decorator';

@ApiTags('Card Info')
@ApiBearerAuth()
@Roles(Role.USER, Role.SUPER_ADMIN)
@Controller('card-info')
export class CardInfoController {
  constructor(private readonly cardInfoService: CardInfoService) {}

  @Post()
  @ApiOperation({ summary: 'Create a new card info' })
  @ApiResponse({ status: 201, description: 'The card info has been successfully created.' })
  create(
    @Body() createCardInfoDto: CreateCardInfoDto,
    @GetUser('userId') userId: string,
  ) {
    return this.cardInfoService.create(createCardInfoDto, userId);
  }

  @Get()
  @ApiOperation({ summary: 'Get all card info' })
  @ApiResponse({ status: 200, description: 'Return all card info.' })
  findAll(@Query() query: CardInfoQueryDto) {
    return this.cardInfoService.findAll(query);
  }

  @Get(':id')
  @ApiOperation({ summary: 'Get a card info by id' })
  @ApiResponse({ status: 200, description: 'Return the card info.' })
  findOne(@Param('id') id: string) {
    return this.cardInfoService.findOne(id);
  }

  @Patch(':id')
  @ApiOperation({ summary: 'Update a card info' })
  @ApiResponse({ status: 200, description: 'The card info has been successfully updated.' })
  update(@Param('id') id: string, @Body() updateCardInfoDto: UpdateCardInfoDto) {
    return this.cardInfoService.update(id, updateCardInfoDto);
  }

  @Delete(':id')
  @ApiOperation({ summary: 'Delete a card info' })
  @ApiResponse({ status: 200, description: 'The card info has been successfully deleted.' })
  remove(@Param('id') id: string) {
    return this.cardInfoService.remove(id);
  }
}
