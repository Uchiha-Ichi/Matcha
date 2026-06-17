import { Controller, Post, Body, HttpCode, HttpStatus } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { AiService } from './ai.service';
import { GenerateIdeaDto } from './dto/generate-idea.dto';
import { PartnerConcept } from '../partner-concepts/entities/partner-concept.entity';

@Controller('ai')
export class AiController {
  constructor(
    private readonly aiService: AiService,
    @InjectRepository(PartnerConcept)
    private readonly partnerConceptRepo: Repository<PartnerConcept>,
  ) {}

  @Post('generate-idea')
  @HttpCode(HttpStatus.OK)
  async generateIdea(@Body() dto: GenerateIdeaDto) {
    // 1. Gọi Gemini AI để sinh ý tưởng chụp ảnh
    const aiOutput = await this.aiService.generateIdea(dto.prompt);

    // Nếu ý tưởng không hợp lệ (ví dụ: người dùng nhập chủ đề không liên quan đến chụp hình)
    if (!aiOutput.isValid) {
      return {
        isValid: false,
        errorMessage: aiOutput.errorMessage,
        recommendedTeam: [],
      };
    }

    // 2. Lấy danh sách đối tác thực tế từ database để gợi ý Dream Team
    const partnerConcepts = await this.partnerConceptRepo.find({
      relations: ['partner', 'partner.user', 'concept'],
    });

    const mappedTeam = partnerConcepts.map((pc) => {
      const conceptNameLower = (pc.concept?.name || '').toLowerCase();
      const bandNameLower = (pc.partner?.band_name || '').toLowerCase();
      
      const isMakeup = 
        conceptNameLower.includes('makeup') || 
        conceptNameLower.includes('trang điểm') || 
        bandNameLower.includes('makeup') || 
        bandNameLower.includes('mua');

      return {
        id: pc.id,
        role: isMakeup ? 'MAKEUP' : 'NHIẾP ẢNH',
        title: pc.concept?.name ?? 'Dịch vụ chụp ảnh',
        partner: pc.partner?.band_name ?? 'Matcha Partner',
        partnerId: `#${pc.partner?.id}`,
        partnerConceptId: pc.id,
        slug: pc.slug,
        rating: pc.partner?.rating_avg > 0 ? Number(pc.partner.rating_avg).toFixed(1) : '5.0',
        price: Number(pc.price),
        image: pc.image_des || pc.partner?.cover_image || 'https://images.unsplash.com/photo-1519741497674-611481863552?auto=format&fit=crop&w=900&q=80',
        avatar: pc.partner?.user?.avatar_src || `https://i.pravatar.cc/100?u=partner-${pc.partner?.id}`,
      };
    });

    // Chia nhóm để đề xuất: 2 nhiếp ảnh và 1 makeup
    const photographers = mappedTeam.filter((m) => m.role === 'NHIẾP ẢNH');
    const makeups = mappedTeam.filter((m) => m.role === 'MAKEUP');

    const recommendedTeam: any[] = [];
    if (photographers.length > 0) recommendedTeam.push(photographers[0]);
    if (photographers.length > 1) recommendedTeam.push(photographers[1]);
    if (makeups.length > 0) recommendedTeam.push(makeups[0]);

    // Nếu vẫn chưa đủ 3 người đề xuất, nạp thêm từ danh sách chung
    while (recommendedTeam.length < 3 && mappedTeam.length > recommendedTeam.length) {
      const next = mappedTeam.find((m) => !recommendedTeam.some((r) => r.id === m.id));
      if (next) recommendedTeam.push(next);
      else break;
    }

    return {
      ...aiOutput,
      recommendedTeam,
    };
  }
}
