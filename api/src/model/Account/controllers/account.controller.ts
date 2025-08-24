import { Controller, Get, Post, Body, Param } from '@nestjs/common';
import { AccountService } from '../services/account.service';
import { ApiBearerAuth, ApiTags, ApiOperation, ApiResponse } from '@nestjs/swagger';
import { AccountDto, AccountResponseDto } from '../dto/account.dto';

@ApiBearerAuth('access-token')
@ApiTags('Account')
@Controller('accounts')
export class AccountController {
  constructor(
    private readonly accountService: AccountService,
  ) {}

  @ApiOperation({ summary: 'Test endpoint' })
  @ApiResponse({ status: 200, description: 'Test successful' })
  @Get('test')
  test() {
    console.log('Test endpoint called - controller method');
    return { message: 'Account controller is working!' };
  }

  @ApiOperation({ summary: 'Get all accounts' })
  @ApiResponse({ status: 200, description: 'Return all accounts', type: [AccountResponseDto] })
  @Get()
  async findAll() {
    console.log('FindAll endpoint called - controller method');
    try {
      const result = await this.accountService.findAll();
      console.log('FindAll result:', result);
      return result;
    } catch (error) {
      console.error('Error in controller findAll:', error);
      throw error;
    }
  }

  @ApiOperation({ summary: 'Get account by id' })
  @ApiResponse({ status: 200, description: 'Return the account', type: AccountResponseDto })
  @Get(':id')
  async findOne(@Param('id') id: string) {
    try {
      const result = await this.accountService.findOne(id);
      return result;
    } catch (error) {
      console.error('Error in controller findOne:', error);
      throw error;
    }
  }

  @ApiOperation({ summary: 'Create new account' })
  @ApiResponse({ status: 201, description: 'Account created successfully', type: AccountResponseDto })
  @Post()
  async create(@Body() createAccountDto: AccountDto) {
    console.log('Create account called with data:', createAccountDto);
    try {
      const result = await this.accountService.create(createAccountDto);
      console.log('Create result:', result);
      return result;
    } catch (error) {
      console.error('Error in controller create:', error);
      throw error;
    }
  }
}