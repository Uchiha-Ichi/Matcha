import { PartialType } from '@nestjs/mapped-types';
import { CreateDateBlockDto } from './create-date-block.dto';

export class UpdateDateBlockDto extends PartialType(CreateDateBlockDto) {}
