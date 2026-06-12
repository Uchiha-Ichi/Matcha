import { Injectable, BadRequestException } from '@nestjs/common';
import { GoogleGenAI } from '@google/genai';

@Injectable()
export class AiService {
  private ai: GoogleGenAI;

  constructor() {
    const apiKey = process.env.GEMINI_API_KEY;
    this.ai = new GoogleGenAI({ apiKey: apiKey || '' });
  }

  async generateIdea(prompt: string) {
    if (!process.env.GEMINI_API_KEY) {
      throw new BadRequestException('Chưa cấu hình API Key cho Gemini AI (GEMINI_API_KEY) trên máy chủ');
    }

    try {
      const systemInstruction = `
        Bạn là giám đốc nghệ thuật và nhiếp ảnh gia sáng tạo chuyên nghiệp của Matcha.
        Nhiệm vụ của bạn là tư vấn concept chụp ảnh, phong cách (styling), trang phục, trang điểm (makeup), địa điểm và hướng dẫn tạo dáng (posing) dựa trên yêu cầu của khách hàng.

        Quy tắc bắt buộc:
        1. Bạn CHỈ được trả lời các chủ đề liên quan đến: chụp ảnh, thiết kế concept photoshoot, phong cách thời trang/makeup cho buổi chụp, gợi ý địa điểm chụp hình, hoặc hướng dẫn tạo dáng chụp ảnh.
        2. Nếu khách hàng nhập yêu cầu KHÔNG liên quan đến chụp hình/nhiếp ảnh (ví dụ: viết code, làm toán, giải bài tập, dạy nấu ăn, trò chuyện phiếm chung chung không liên quan đến hình ảnh...), bạn PHẢI đặt trường "isValid" thành false và điền lý do từ chối vào "errorMessage" bằng tiếng Việt một cách lịch sự (ví dụ: "Matcha AI chỉ hỗ trợ lên ý tưởng liên quan đến chụp ảnh và concept nhiếp ảnh. Vui lòng nhập lại ý tưởng chụp ảnh của bạn!").
        3. Phản hồi của bạn bắt buộc phải bằng tiếng Việt và tuân thủ hoàn toàn định dạng JSON Schema được yêu cầu.
      `;

      const response = await this.ai.models.generateContent({
        model: 'gemini-2.0-flash',
        contents: `Yêu cầu ý tưởng chụp ảnh: "${prompt}"`,
        config: {
          systemInstruction,
          responseMimeType: 'application/json',
          responseSchema: {
            type: 'object',
            properties: {
              isValid: {
                type: 'boolean',
                description: 'True nếu yêu cầu của khách hàng liên quan đến chụp ảnh, tạo dáng, trang điểm, trang phục hoặc concept photoshoot. False nếu không liên quan.'
              },
              errorMessage: {
                type: 'string',
                description: 'Lời nhắn từ chối lịch sự bằng tiếng Việt nếu isValid là false. Để trống nếu isValid là true.'
              },
              title: {
                type: 'string',
                description: 'Tên concept chụp ảnh ngắn gọn, đầy chất nghệ thuật bằng tiếng Việt (ví dụ: Nàng thơ ven Hồ Tây, Vintage cổ điển Pháp, Đường phố Hà Nội mùa thu...)'
              },
              description: {
                type: 'string',
                description: 'Mô tả chi tiết câu chuyện, ý nghĩa hoặc thông điệp của concept chụp ảnh bằng tiếng Việt (khoảng 2-3 câu).'
              },
              tags: {
                type: 'array',
                items: { type: 'string' },
                description: '5-6 từ khóa (tags) viết hoa liên quan đến concept (ví dụ: ["NÀNG THƠ", "CỔ ĐIỂN", "HỒ TÂY", "LÃNG MẠN"]).'
              },
              vibe: {
                type: 'string',
                description: 'Mô tả phong cách, không khí, cảm xúc (vibe) mà concept hướng tới bằng tiếng Việt.'
              },
              makeupAndCostume: {
                type: 'string',
                description: 'Gợi ý chi tiết cách trang điểm (makeup) và chọn lựa trang phục (costume), phụ kiện đi kèm phù hợp bằng tiếng Việt.'
              },
              locationRecommendation: {
                type: 'string',
                description: 'Gợi ý một số địa điểm chụp ảnh lý tưởng phù hợp với concept này bằng tiếng Việt.'
              },
              bestLightTime: {
                type: 'string',
                description: 'Khung giờ chụp ảnh đẹp nhất và điều kiện ánh sáng khuyến nghị (ví dụ: 16:00 - 18:30 hoàng hôn, hoặc 7:30 - 9:30 nắng sớm).'
              },
              suggestedBudget: {
                type: 'string',
                description: 'Ngân sách đề xuất phù hợp cho buổi chụp (ví dụ: 1.500.000 - 3.000.000 VND).'
              },
              posingIdeas: {
                type: 'array',
                items: {
                  type: 'object',
                  properties: {
                    title: { type: 'string', description: 'Tên tư thế hoặc hành động tạo dáng bằng tiếng Việt.' },
                    description: { type: 'string', description: 'Mô tả chi tiết cách tạo dáng để bức ảnh tự nhiên nhất bằng tiếng Việt.' }
                  },
                  required: ['title', 'description']
                },
                description: 'Danh sách 3 gợi ý tạo dáng chụp ảnh độc đáo.'
              }
            },
            required: [
              'isValid',
              'errorMessage',
              'title',
              'description',
              'tags',
              'vibe',
              'makeupAndCostume',
              'locationRecommendation',
              'bestLightTime',
              'suggestedBudget',
              'posingIdeas'
            ]
          }
        }
      });

      const resultText = response.text;
      if (!resultText) {
        throw new Error('Gemini AI không trả về phản hồi.');
      }

      return JSON.parse(resultText);
    } catch (error: any) {
      console.error('[Gemini AI Error]:', error);
      throw new BadRequestException('Không thể xử lý yêu cầu lên ý tưởng: ' + error.message);
    }
  }
}
