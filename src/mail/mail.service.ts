import { Injectable, Logger } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { setApiKey, send } from '@sendgrid/mail';
@Injectable()
export class MailService {
  private readonly logger = new Logger(MailService.name);
  private readonly fromEmail: string;

  constructor(private readonly configService: ConfigService) {
    const apiKey = this.configService.get<string>('SENDGRID_API');
    if (apiKey) {
      setApiKey(apiKey);
      this.logger.log('SendGrid API initialized successfully.');
    } else {
      this.logger.warn('SENDGRID_API key is not defined in the environment variables.');
    }
    // Fallback to matcha.platform.contact@gmail.com if not defined
    this.fromEmail = this.configService.get<string>('SENDGRID_SENDER') || 'matcha.platform.contact@gmail.com';
  }

  /**
   * Gửi email chào mừng khi đăng ký tài khoản thành công
   */
  async sendSignUpEmail(to: string, fullName: string): Promise<boolean> {
    const mailOptions = {
      to,
      from: {
        email: this.fromEmail,
        name: 'Matcha Platform',
      },
      subject: 'Chào mừng bạn đến với Matcha! 🎉',
      html: `
        <div style="font-family: 'Segoe UI', Tahoma, Geneva, Verdana, sans-serif; max-width: 600px; margin: 0 auto; border: 1px solid #e0e0e0; border-radius: 12px; overflow: hidden; box-shadow: 0 4px 15px rgba(0,0,0,0.05); background-color: #ffffff;">
          <div style="background: linear-gradient(135deg, #4CAF50, #2E7D32); padding: 30px; text-align: center; color: white;">
            <h1 style="margin: 0; font-size: 28px; font-weight: 700; letter-spacing: 0.5px;">Welcome to Matcha!</h1>
            <p style="margin: 5px 0 0 0; font-size: 16px; opacity: 0.9;">Nền tảng đặt lịch chụp ảnh & concept hàng đầu</p>
          </div>
          <div style="padding: 30px; color: #333333; line-height: 1.6;">
            <p style="font-size: 16px; margin-top: 0;">Xin chào <strong>${fullName}</strong>,</p>
            <p style="font-size: 15px;">Chào mừng bạn đã gia nhập cộng đồng <strong>Matcha</strong>. Tài khoản của bạn đã được đăng ký thành công bằng email <strong>${to}</strong>.</p>
            <p style="font-size: 15px;">Giờ đây, bạn có thể bắt đầu trải nghiệm dịch vụ của chúng tôi:</p>
            <ul style="padding-left: 20px; font-size: 15px; color: #555555;">
              <li style="margin-bottom: 8px;">Khám phá các concept chụp ảnh nghệ thuật & độc đáo.</li>
              <li style="margin-bottom: 8px;">Đặt lịch nhanh chóng với các thợ chụp ảnh chuyên nghiệp.</li>
              <li style="margin-bottom: 8px;">Sáng tạo ý tưởng chụp ảnh với sự hỗ trợ của Trợ lý AI thông minh.</li>
            </ul>
            <div style="text-align: center; margin: 35px 0 20px 0;">
              <a href="${this.configService.get<string>('FRONTEND_URL') || 'http://localhost:5173'}" style="background-color: #4CAF50; color: white; padding: 12px 30px; text-decoration: none; border-radius: 8px; font-weight: bold; font-size: 16px; display: inline-block; box-shadow: 0 4px 6px rgba(76, 175, 80, 0.2); transition: background-color 0.3s;">Khám phá Matcha ngay</a>
            </div>
          </div>
          <div style="background-color: #f9f9f9; padding: 20px; text-align: center; font-size: 13px; color: #888888; border-top: 1px solid #eeeeee;">
            <p style="margin: 0 0 5px 0;">Đây là email tự động từ hệ thống Matcha, vui lòng không trả lời email này.</p>
            <p style="margin: 0;">&copy; 2026 Matcha Platform. All rights reserved.</p>
          </div>
        </div>
      `,
    };

    try {
      await send(mailOptions);
      this.logger.log(`SignUp email sent successfully to ${to}`);
      return true;
    } catch (error: any) {
      this.logger.error(`Failed to send SignUp email to ${to}: ${error.message}`);
      if (error.response) {
        this.logger.error(JSON.stringify(error.response.body));
      }
      return false;
    }
  }

  /**
   * Gửi email mã OTP khôi phục mật khẩu
   */
  async sendForgotPasswordOtpEmail(to: string, otp: string): Promise<boolean> {
    const mailOptions = {
      to,
      from: {
        email: this.fromEmail,
        name: 'Matcha Platform Support',
      },
      subject: `[Matcha] Mã xác thực khôi phục mật khẩu: ${otp}`,
      html: `
        <div style="font-family: 'Segoe UI', Tahoma, Geneva, Verdana, sans-serif; max-width: 600px; margin: 0 auto; border: 1px solid #e0e0e0; border-radius: 12px; overflow: hidden; box-shadow: 0 4px 15px rgba(0,0,0,0.05); background-color: #ffffff;">
          <div style="background: linear-gradient(135deg, #E53935, #C62828); padding: 30px; text-align: center; color: white;">
            <h1 style="margin: 0; font-size: 26px; font-weight: 700; letter-spacing: 0.5px;">Khôi phục mật khẩu</h1>
            <p style="margin: 5px 0 0 0; font-size: 15px; opacity: 0.9;">Yêu cầu đặt lại mật khẩu cho tài khoản Matcha của bạn</p>
          </div>
          <div style="padding: 30px; color: #333333; line-height: 1.6;">
            <p style="font-size: 16px; margin-top: 0;">Xin chào,</p>
            <p style="font-size: 15px;">Chúng tôi nhận được yêu cầu khôi phục mật khẩu của bạn tại Matcha Platform. Vui lòng sử dụng mã xác thực dưới đây để hoàn tất tiến trình:</p>
            
            <div style="text-align: center; margin: 30px 0;">
              <span style="font-family: 'Courier New', Courier, monospace; background-color: #f5f5f5; border: 1px dashed #d0d0d0; color: #C62828; padding: 12px 30px; font-size: 32px; font-weight: bold; letter-spacing: 6px; border-radius: 8px; display: inline-block; box-shadow: inset 0 2px 4px rgba(0,0,0,0.02);">${otp}</span>
            </div>
            
            <p style="font-size: 14px; color: #e53935; font-weight: 500;">* Mã OTP này chỉ có hiệu lực trong vòng 10 phút. Tuyệt đối không chia sẻ mã này với bất kỳ ai để bảo mật tài khoản.</p>
            <p style="font-size: 15px; margin-bottom: 0;">Nếu bạn không yêu cầu thay đổi này, hãy bỏ qua email này hoặc liên hệ ngay với bộ phận bảo mật của chúng tôi.</p>
          </div>
          <div style="background-color: #f9f9f9; padding: 20px; text-align: center; font-size: 13px; color: #888888; border-top: 1px solid #eeeeee;">
            <p style="margin: 0 0 5px 0;">Đây là email tự động từ hệ thống Matcha, vui lòng không trả lời email này.</p>
            <p style="margin: 0;">&copy; 2026 Matcha Platform. All rights reserved.</p>
          </div>
        </div>
      `,
    };

    try {
      await send(mailOptions);
      this.logger.log(`ForgotPassword OTP email sent successfully to ${to}`);
      return true;
    } catch (error: any) {
      this.logger.error(`Failed to send ForgotPassword OTP email to ${to}: ${error.message}`);
      if (error.response) {
        this.logger.error(JSON.stringify(error.response.body));
      }
      return false;
    }
  }

  /**
   * Gửi email mã OTP xác thực đăng ký tài khoản
   */
  async sendSignUpOtpEmail(to: string, otp: string): Promise<boolean> {
    const mailOptions = {
      to,
      from: {
        email: this.fromEmail,
        name: 'Matcha Platform Support',
      },
      subject: `[Matcha] Mã xác thực đăng ký tài khoản: ${otp}`,
      html: `
        <div style="font-family: 'Segoe UI', Tahoma, Geneva, Verdana, sans-serif; max-width: 600px; margin: 0 auto; border: 1px solid #e0e0e0; border-radius: 12px; overflow: hidden; box-shadow: 0 4px 15px rgba(0,0,0,0.05); background-color: #ffffff;">
          <div style="background: linear-gradient(135deg, #4CAF50, #388E3C); padding: 30px; text-align: center; color: white;">
            <h1 style="margin: 0; font-size: 26px; font-weight: 700; letter-spacing: 0.5px;">Xác thực đăng ký tài khoản</h1>
            <p style="margin: 5px 0 0 0; font-size: 15px; opacity: 0.9;">Mã xác thực của bạn cho tài khoản Matcha</p>
          </div>
          <div style="padding: 30px; color: #333333; line-height: 1.6;">
            <p style="font-size: 16px; margin-top: 0;">Xin chào,</p>
            <p style="font-size: 15px;">Cảm ơn bạn đã lựa chọn Matcha Platform. Vui lòng sử dụng mã xác thực dưới đây để hoàn tất tiến trình đăng ký tài khoản:</p>
            
            <div style="text-align: center; margin: 30px 0;">
              <span style="font-family: 'Courier New', Courier, monospace; background-color: #f5f5f5; border: 1px dashed #d0d0d0; color: #388E3C; padding: 12px 30px; font-size: 32px; font-weight: bold; letter-spacing: 6px; border-radius: 8px; display: inline-block; box-shadow: inset 0 2px 4px rgba(0,0,0,0.02);">${otp}</span>
            </div>
            
            <p style="font-size: 14px; color: #388E3C; font-weight: 500;">* Mã OTP này chỉ có hiệu lực trong vòng 10 phút. Tuyệt đối không chia sẻ mã này với bất kỳ ai để bảo mật tài khoản.</p>
            <p style="font-size: 15px; margin-bottom: 0;">Nếu bạn không thực hiện đăng ký tài khoản tại Matcha, hãy bỏ qua email này.</p>
          </div>
          <div style="background-color: #f9f9f9; padding: 20px; text-align: center; font-size: 13px; color: #888888; border-top: 1px solid #eeeeee;">
            <p style="margin: 0 0 5px 0;">Đây là email tự động từ hệ thống Matcha, vui lòng không trả lời email này.</p>
            <p style="margin: 0;">&copy; 2026 Matcha Platform. All rights reserved.</p>
          </div>
        </div>
      `,
    };

    try {
      await send(mailOptions);
      this.logger.log(`SignUp OTP email sent successfully to ${to}`);
      return true;
    } catch (error: any) {
      this.logger.error(`Failed to send SignUp OTP email to ${to}: ${error.message}`);
      if (error.response) {
        this.logger.error(JSON.stringify(error.response.body));
      }
      return false;
    }
  }
}
