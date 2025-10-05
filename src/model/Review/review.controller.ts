import { Controller, Get, Post, Body, Param, Delete, UseGuards, Request } from '@nestjs/common';
import { ReviewService } from './review.service';
import { CreateReviewDto } from './dto/create-review.dto';
import { ApiTags, ApiResponse, ApiBearerAuth } from '@nestjs/swagger';
import { JwtAuthGuard } from '@feature/security/guards/jwt-auth.guard';

@ApiTags('reviews')
@Controller('reviews')
@UseGuards(JwtAuthGuard)
@ApiBearerAuth()
export class ReviewController {
  constructor(private readonly reviewService: ReviewService) {}

  @Post()
  @ApiResponse({ status: 201, description: 'Review created successfully' })
  create(@Request() req, @Body() createReviewDto: CreateReviewDto) {
    return this.reviewService.create(req.user.id, createReviewDto);
  }

  @Get()
  @ApiResponse({ status: 200, description: 'Return all reviews' })
  findAll() {
    return this.reviewService.findAll();
  }

  @Get('event/:eventId')
  @ApiResponse({ status: 200, description: 'Return reviews for an event' })
  findByEvent(@Param('eventId') eventId: string) {
    return this.reviewService.findByEvent(eventId);
  }

  @Get(':id')
  @ApiResponse({ status: 200, description: 'Return a review by id' })
  findOne(@Param('id') id: string) {
    return this.reviewService.findOne(id);
  }

  @Delete(':id')
  @ApiResponse({ status: 200, description: 'Review deleted successfully' })
  remove(@Param('id') id: string) {
    return this.reviewService.remove(id);
  }
} 