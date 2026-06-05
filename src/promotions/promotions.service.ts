import { Injectable, NotFoundException, BadRequestException, ConflictException } from '@nestjs/common';
import { CreatePromotionDto } from './dto/create-promotion.dto';
import { UpdatePromotionDto } from './dto/update-promotion.dto';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { Promotion } from './entities/promotion.entity';

@Injectable()
export class PromotionsService {
  constructor(
    @InjectRepository(Promotion)
    private readonly promotionsRepository: Repository<Promotion>,
  ) {}

  async create(createPromotionDto: CreatePromotionDto): Promise<Promotion> {
    const codeUpper = createPromotionDto.code.toUpperCase();
    const existing = await this.promotionsRepository.findOne({
      where: { code: codeUpper },
    });
    if (existing) {
      throw new ConflictException(`Mã khuyến mãi '${createPromotionDto.code}' đã tồn tại`);
    }

    const hasPercentage = typeof createPromotionDto.discount_percentage === 'number' && createPromotionDto.discount_percentage > 0;
    const hasAmount = typeof createPromotionDto.discount_amount === 'number' && createPromotionDto.discount_amount > 0;

    if (!hasPercentage && !hasAmount) {
      throw new BadRequestException('Phải cung cấp phần trăm giảm giá (discount_percentage) hoặc số tiền giảm giá (discount_amount) lớn hơn 0');
    }

    const promotion = this.promotionsRepository.create({
      ...createPromotionDto,
      code: codeUpper,
      expired_at: createPromotionDto.expired_at ? new Date(createPromotionDto.expired_at) : undefined,
    });

    return await this.promotionsRepository.save(promotion);
  }

  async findAll(): Promise<Promotion[]> {
    return await this.promotionsRepository.find();
  }

  async findOne(id: number): Promise<Promotion> {
    const promotion = await this.promotionsRepository.findOne({ where: { id } });
    if (!promotion) {
      throw new NotFoundException(`Không tìm thấy mã khuyến mãi #${id}`);
    }
    return promotion;
  }

  async findByCode(code: string): Promise<Promotion> {
    const promotion = await this.promotionsRepository.findOne({
      where: { code: code.toUpperCase() },
    });
    if (!promotion) {
      throw new NotFoundException(`Không tìm thấy mã khuyến mãi '${code}'`);
    }
    return promotion;
  }

  async validateCode(code: string): Promise<Promotion> {
    const promotion = await this.findByCode(code);

    if (!promotion.is_active) {
      throw new BadRequestException(`Mã khuyến mãi '${code}' hiện đang bị vô hiệu hoá`);
    }

    if (promotion.expired_at && new Date(promotion.expired_at) < new Date()) {
      throw new BadRequestException(`Mã khuyến mãi '${code}' đã hết hạn sử dụng`);
    }

    return promotion;
  }

  async update(id: number, updatePromotionDto: UpdatePromotionDto): Promise<Promotion> {
    const promotion = await this.findOne(id);

    if (updatePromotionDto.code) {
      const codeUpper = updatePromotionDto.code.toUpperCase();
      const existing = await this.promotionsRepository.findOne({
        where: { code: codeUpper },
      });
      if (existing && existing.id !== id) {
        throw new ConflictException(`Mã khuyến mãi '${updatePromotionDto.code}' đã tồn tại ở bản ghi khác`);
      }
    }

    const updated = await this.promotionsRepository.save({
      ...promotion,
      ...updatePromotionDto,
      code: updatePromotionDto.code ? updatePromotionDto.code.toUpperCase() : promotion.code,
      expired_at: updatePromotionDto.expired_at ? new Date(updatePromotionDto.expired_at) : promotion.expired_at,
    });

    return updated;
  }

  async remove(id: number): Promise<{ message: string }> {
    const promotion = await this.findOne(id);
    await this.promotionsRepository.remove(promotion);
    return { message: `Đã xoá mã khuyến mãi #${id} thành công` };
  }
}
