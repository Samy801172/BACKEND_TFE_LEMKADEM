import { Controller, Get, Post } from '@nestjs/common';
import { AppService } from './app.service';
import { ApiOperation } from '@nestjs/swagger';
import { ApiCodeResponse, ApiResponse } from '@common/config';

@Controller('start')
export class AppController {
  constructor(private readonly appService: AppService) {}

  @ApiOperation({ summary: 'Hello World endpoint' })
  @Get('hello')
  getHello(): ApiResponse {
    return { result: true, code: ApiCodeResponse.TEST, data: this.appService.getHello() };
  }

  @ApiOperation({ summary: 'Hello World 2 endpoint' })
  @Post('hello2')
  getHello2(): ApiResponse {
    return { result: true, code: ApiCodeResponse.TEST, data: this.appService.getHello() };
  }

  @ApiOperation({ summary: 'Health check endpoint' })
  @Get('health')
  getHealth(): ApiResponse {
    return { 
      result: true, 
      code: ApiCodeResponse.TEST, 
      data: { 
        status: 'OK', 
        timestamp: new Date().toISOString(),
        uptime: process.uptime()
      } 
    };
  }
}
