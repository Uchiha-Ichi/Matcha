import { PartialType } from '@nestjs/mapped-types';
import { CreatePartnerConceptDto } from './create-partner-concept.dto';

export class UpdatePartnerConceptDto extends PartialType(CreatePartnerConceptDto) {}
