import { Injectable } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { User } from '../../User/entities/user.entity';
import { AccountDto } from '../dto/account.dto';

@Injectable()
export class AccountService {
  constructor(
    @InjectRepository(User)
    private readonly userRepository: Repository<User>,
  ) {
    // console.log('AccountService initialized'); // Suppression du log inutile
  }

  async findAll() {
    try {
      // console.log('AccountService.findAll() called'); // Suppression du log inutile
      const users = await this.userRepository.find();
      // console.log('Found users:', users); // Suppression du log inutile
      return users;
    } catch (error) {
      console.error('Error in findAll:', error);
      throw error;
    }
  }

  async findOne(id: string) {
    try {
      // console.log('AccountService.findOne() called with id:', id); // Suppression du log inutile
      const user = await this.userRepository.findOne({ where: { id } });
      // console.log('Found user:', user); // Suppression du log inutile
      return user;
    } catch (error) {
      console.error('Error in findOne:', error);
      throw error;
    }
  }

  async create(createAccountDto: AccountDto) {
    try {
      // console.log('AccountService.create() called with:', createAccountDto); // Suppression du log inutile
      const user = this.userRepository.create(createAccountDto);
      const result = await this.userRepository.save(user);
      // console.log('Created user:', result); // Suppression du log inutile
      return result;
    } catch (error) {
      console.error('Error in service create:', error);
      throw error;
    }
  }
} 