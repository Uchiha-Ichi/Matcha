import { Injectable, NotFoundException } from '@nestjs/common';
import { CreateDateBlockDto } from './dto/create-date-block.dto';
import { UpdateDateBlockDto } from './dto/update-date-block.dto';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { DateBlock } from './entities/date-block.entity';

@Injectable()
export class DateBlocksService {
  constructor(
    @InjectRepository(DateBlock)
    private readonly dateBlocksRepository: Repository<DateBlock>,
  ) { }
  create(createDateBlockDto: CreateDateBlockDto) {
    return this.dateBlocksRepository.save(createDateBlockDto);
  }

  findAll() {
    return this.dateBlocksRepository.find();
  }

  findOne(id: number) {
    return this.dateBlocksRepository.findOne({ where: { id } });
  }

  update(id: number, updateDateBlockDto: UpdateDateBlockDto) {
    return this.dateBlocksRepository.update(id, updateDateBlockDto);
  }

  remove(id: number) {
    return this.dateBlocksRepository.delete(id);
  }
}
