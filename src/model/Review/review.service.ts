import { Injectable, NotFoundException } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { Review } from './entities/review.entity';
import { CreateReviewDto } from './dto/create-review.dto';

@Injectable()
export class ReviewService {
  constructor(
    @InjectRepository(Review)
    private readonly reviewRepository: Repository<Review>
  ) {}

  async create(authorId: string, createReviewDto: CreateReviewDto): Promise<Review> {
    const review = this.reviewRepository.create({
      ...createReviewDto,
      author: { id: authorId }
    });
    return await this.reviewRepository.save(review);
  }

  async findAll(): Promise<Review[]> {
    return await this.reviewRepository.find({
      relations: ['author', 'event']
    });
  }

  async findByEvent(eventId: string): Promise<Review[]> {
    return await this.reviewRepository.find({
      where: { event: { id: eventId } },
      relations: ['author']
    });
  }

  async findOne(id: string): Promise<Review> {
    const review = await this.reviewRepository.findOne({
      where: { id },
      relations: ['author', 'event']
    });
    if (!review) {
      throw new NotFoundException('Review not found');
    }
    return review;
  }

  async remove(id: string): Promise<void> {
    await this.reviewRepository.delete(id);
  }
} 