import { Injectable } from '@nestjs/common';
import { CreateDateBlockDto } from './dto/create-date-block.dto';
import { UpdateDateBlockDto } from './dto/update-date-block.dto';

@Injectable()
export class DateBlocksService {
  create(createDateBlockDto: CreateDateBlockDto) {
    return 'This action adds a new dateBlock';
  }

  findAll() {
    return `This action returns all dateBlocks`;
  }

  findOne(id: number) {
    return `This action returns a #${id} dateBlock`;
  }

  update(id: number, updateDateBlockDto: UpdateDateBlockDto) {
    return `This action updates a #${id} dateBlock`;
  }

  remove(id: number) {
    return `This action removes a #${id} dateBlock`;
  }
}
