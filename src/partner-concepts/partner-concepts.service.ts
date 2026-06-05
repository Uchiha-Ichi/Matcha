import { Injectable, NotFoundException } from '@nestjs/common';
import { CreatePartnerConceptDto } from './dto/create-partner-concept.dto';
import { UpdatePartnerConceptDto } from './dto/update-partner-concept.dto';
import { InjectRepository } from '@nestjs/typeorm';
import { PartnerConcept } from './entities/partner-concept.entity';
import { Repository } from 'typeorm';
import { ImageService } from 'src/image/image.service';
import { ImageTargetType } from 'src/image/entities/image.entity';

@Injectable()
export class PartnerConceptsService {
  constructor(
    @InjectRepository(PartnerConcept)
    private readonly partnerConceptsRepository: Repository<PartnerConcept>,
    private readonly imageService: ImageService,
  ) { }

  async create(createPartnerConceptDto: CreatePartnerConceptDto) {
    const saved = await this.partnerConceptsRepository.save(createPartnerConceptDto);
    if (createPartnerConceptDto.image_des) {
      await this.imageService.createImage(ImageTargetType.PARTNER_CONCEPT, saved.id, createPartnerConceptDto.image_des, true);
    }
    return saved;
  }

  async findAll() {
    const partnerConcepts = await this.partnerConceptsRepository.find({
      relations: ['partner', 'concept'],
    });
    if (!partnerConcepts) {
      throw new NotFoundException(`Không tìm thấy partner concept`);
    }
    for (const pc of partnerConcepts) {
      const images = await this.imageService.getImagesForTarget(ImageTargetType.PARTNER_CONCEPT, pc.id);
      pc['images'] = images;
      const primary = images.find(img => img.is_primary);
      if (primary) {
        pc.image_des = primary.image_src;
      }
    }
    return partnerConcepts;
  }

  async findOne(id: number) {
    const partnerConcept = await this.partnerConceptsRepository.findOne({
      where: { id },
      relations: ['partner', 'concept'],
    });
    if (!partnerConcept) {
      throw new NotFoundException(`Không tìm thấy partner concept #${id}`);
    }
    const images = await this.imageService.getImagesForTarget(ImageTargetType.PARTNER_CONCEPT, id);
    partnerConcept['images'] = images;
    const primary = images.find(img => img.is_primary);
    if (primary) {
      partnerConcept.image_des = primary.image_src;
    }
    return partnerConcept;
  }

  async update(id: number, updatePartnerConceptDto: UpdatePartnerConceptDto) {
    const partnerConcept = await this.partnerConceptsRepository.findOne({ where: { id } });
    if (!partnerConcept) {
      throw new NotFoundException(`Không tìm thấy partner concept #${id}`);
    }
    if (updatePartnerConceptDto.image_des) {
      await this.imageService.updatePrimaryImage(ImageTargetType.PARTNER_CONCEPT, id, updatePartnerConceptDto.image_des);
    }
    return await this.partnerConceptsRepository.update(id, updatePartnerConceptDto);
  }

  async remove(id: number) {
    const partnerConcept = await this.partnerConceptsRepository.findOne({ where: { id } });
    if (!partnerConcept) {
      throw new NotFoundException(`Không tìm thấy partner concept #${id}`);
    }
    await this.imageService.deleteImagesForTarget(ImageTargetType.PARTNER_CONCEPT, id);
    return await this.partnerConceptsRepository.delete(id);
  }

  async findByPartnerId(partnerId: number) {
    const partnerConcepts = await this.partnerConceptsRepository.find({ where: { partner: { id: partnerId } } });
    if (!partnerConcepts) {
      throw new NotFoundException(`Không tìm thấy partner concept`);
    }
    for (const pc of partnerConcepts) {
      const images = await this.imageService.getImagesForTarget(ImageTargetType.PARTNER_CONCEPT, pc.id);
      pc['images'] = images;
      const primary = images.find(img => img.is_primary);
      if (primary) {
        pc.image_des = primary.image_src;
      }
    }
    return partnerConcepts;
  }

  async findByConceptId(conceptId: number) {
    const partnerConcepts = await this.partnerConceptsRepository.find({ where: { concept: { id: conceptId } } });
    if (!partnerConcepts) {
      throw new NotFoundException(`Không tìm thấy partner concept`);
    }
    for (const pc of partnerConcepts) {
      const images = await this.imageService.getImagesForTarget(ImageTargetType.PARTNER_CONCEPT, pc.id);
      pc['images'] = images;
      const primary = images.find(img => img.is_primary);
      if (primary) {
        pc.image_des = primary.image_src;
      }
    }
    return partnerConcepts;
  }
}
