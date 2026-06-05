import { Injectable, NotFoundException } from '@nestjs/common';
import { CreateConceptDto } from './dto/create-concept.dto';
import { UpdateConceptDto } from './dto/update-concept.dto';
import { InjectRepository } from '@nestjs/typeorm';
import { Concept } from './entities/concept.entity';
import { Repository } from 'typeorm';
import { ImageService } from 'src/image/image.service';
import { ImageTargetType } from 'src/image/entities/image.entity';

@Injectable()
export class ConceptsService {
  constructor(
    @InjectRepository(Concept)
    private readonly conceptsRepository: Repository<Concept>,
    private readonly imageService: ImageService,
  ) { }

  async create(createConceptDto: CreateConceptDto) {
    const concept = await this.conceptsRepository.findOne({ where: { name: createConceptDto.name } });
    if (concept) {
      throw new NotFoundException(`Concept đã tồn tại #${createConceptDto.name}`);
    }
    const savedConcept = await this.conceptsRepository.save(createConceptDto);
    if (createConceptDto.image) {
      await this.imageService.createImage(ImageTargetType.CONCEPT, savedConcept.id, createConceptDto.image, true);
    }
    return savedConcept;
  }

  async findAll() {
    const concepts = await this.conceptsRepository.find();
    if (!concepts) {
      throw new NotFoundException(`Không tìm thấy concept`);
    }
    for (const concept of concepts) {
      const images = await this.imageService.getImagesForTarget(ImageTargetType.CONCEPT, concept.id);
      concept['images'] = images;
      const primary = images.find(img => img.is_primary);
      if (primary) {
        concept.image = primary.image_src;
      }
    }
    return concepts;
  }

  async findOne(id: number) {
    const concept = await this.conceptsRepository.findOne({ where: { id } });
    if (!concept) {
      throw new NotFoundException(`Không tìm thấy concept #${id}`);
    }
    const images = await this.imageService.getImagesForTarget(ImageTargetType.CONCEPT, id);
    concept['images'] = images;
    const primary = images.find(img => img.is_primary);
    if (primary) {
      concept.image = primary.image_src;
    }
    return concept;
  }

  async update(id: number, updateConceptDto: UpdateConceptDto) {
    const concept = await this.conceptsRepository.findOne({ where: { id } });
    if (!concept) {
      throw new NotFoundException(`Không tìm thấy concept #${id}`);
    }
    if (updateConceptDto.image) {
      await this.imageService.updatePrimaryImage(ImageTargetType.CONCEPT, id, updateConceptDto.image);
    }
    return await this.conceptsRepository.update(id, updateConceptDto);
  }

  async remove(id: number) {
    const concept = await this.conceptsRepository.findOne({ where: { id } });
    if (!concept) {
      throw new NotFoundException(`Không tìm thấy concept #${id}`);
    }
    await this.imageService.deleteImagesForTarget(ImageTargetType.CONCEPT, id);
    return await this.conceptsRepository.delete(id);
  }
}
