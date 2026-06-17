import { Injectable, NotFoundException, OnModuleInit } from '@nestjs/common';
import { CreatePartnerConceptDto } from './dto/create-partner-concept.dto';
import { UpdatePartnerConceptDto } from './dto/update-partner-concept.dto';
import { InjectRepository } from '@nestjs/typeorm';
import { PartnerConcept } from './entities/partner-concept.entity';
import { Repository } from 'typeorm';
import { ImageService } from 'src/image/image.service';
import { ImageTargetType } from 'src/image/entities/image.entity';
import { Partner } from '../partners/entities/partner.entity';
import { Concept } from '../concepts/entities/concept.entity';
import slugify from 'slugify';

@Injectable()
export class PartnerConceptsService implements OnModuleInit {
  constructor(
    @InjectRepository(PartnerConcept)
    private readonly partnerConceptsRepository: Repository<PartnerConcept>,
    private readonly imageService: ImageService,
  ) { }

  async onModuleInit() {
    const repo = this.partnerConceptsRepository;
    const existing = await repo.find({
      relations: ['partner', 'concept'],
    });
    for (const pc of existing) {
      if (!pc.slug) {
        const conceptName = pc.concept?.name || '';
        const partnerName = pc.partner?.band_name || '';
        const nameToSlugify = `${conceptName} ${partnerName}`.trim() || `service-detail-${pc.id}`;
        pc.slug = slugify(nameToSlugify, {
          locale: 'vi',
          lower: true,
          strict: true
        });
        await repo.save(pc);
      }
    }
  }

  async create(createPartnerConceptDto: CreatePartnerConceptDto) {
    const partnersRepo = this.partnerConceptsRepository.manager.getRepository(Partner);
    const conceptsRepo = this.partnerConceptsRepository.manager.getRepository(Concept);

    const partner = await partnersRepo.findOne({ where: { id: Number((createPartnerConceptDto as any).partner_id) } });
    const concept = await conceptsRepo.findOne({ where: { id: Number((createPartnerConceptDto as any).concept_id) } });

    if (!partner) {
      throw new NotFoundException(`Không tìm thấy đối tác #${(createPartnerConceptDto as any).partner_id}`);
    }
    if (!concept) {
      throw new NotFoundException(`Không tìm thấy gói dịch vụ #${(createPartnerConceptDto as any).concept_id}`);
    }

    const entity = this.partnerConceptsRepository.create({
      price: createPartnerConceptDto.price,
      time: createPartnerConceptDto.time,
      image_des: createPartnerConceptDto.image_des,
      partner,
      concept
    });

    const saved = await this.partnerConceptsRepository.save(entity);
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

  async findOneBySlug(slug: string) {
    const partnerConcept = await this.partnerConceptsRepository.findOne({
      where: { slug },
      relations: ['partner', 'concept'],
    });
    if (!partnerConcept) {
      throw new NotFoundException(`Không tìm thấy partner concept với đường dẫn #${slug}`);
    }
    const images = await this.imageService.getImagesForTarget(ImageTargetType.PARTNER_CONCEPT, partnerConcept.id);
    partnerConcept['images'] = images;
    const primary = images.find(img => img.is_primary);
    if (primary) {
      partnerConcept.image_des = primary.image_src;
    }
    return partnerConcept;
  }

  async update(id: number, updatePartnerConceptDto: UpdatePartnerConceptDto) {
    const partnerConcept = await this.partnerConceptsRepository.findOne({
      where: { id },
      relations: ['partner', 'concept']
    });
    if (!partnerConcept) {
      throw new NotFoundException(`Không tìm thấy partner concept #${id}`);
    }

    if (updatePartnerConceptDto.price !== undefined) {
      partnerConcept.price = updatePartnerConceptDto.price;
    }
    if (updatePartnerConceptDto.time !== undefined) {
      partnerConcept.time = updatePartnerConceptDto.time;
    }
    if (updatePartnerConceptDto.image_des !== undefined) {
      partnerConcept.image_des = updatePartnerConceptDto.image_des;
      await this.imageService.updatePrimaryImage(ImageTargetType.PARTNER_CONCEPT, id, updatePartnerConceptDto.image_des);
    }

    if ((updatePartnerConceptDto as any).partner_id) {
      const partnersRepo = this.partnerConceptsRepository.manager.getRepository(Partner);
      const partner = await partnersRepo.findOne({ where: { id: Number((updatePartnerConceptDto as any).partner_id) } });
      if (partner) partnerConcept.partner = partner;
    }
    if ((updatePartnerConceptDto as any).concept_id) {
      const conceptsRepo = this.partnerConceptsRepository.manager.getRepository(Concept);
      const concept = await conceptsRepo.findOne({ where: { id: Number((updatePartnerConceptDto as any).concept_id) } });
      if (concept) partnerConcept.concept = concept;
    }

    return await this.partnerConceptsRepository.save(partnerConcept);
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
