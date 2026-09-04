import { Injectable, Logger } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import * as nodemailer from 'nodemailer';

@Injectable()
export class MailService {
  private readonly logger = new Logger(MailService.name);
  private transporter: nodemailer.Transporter;

  constructor(private configService: ConfigService) {
    this.transporter = nodemailer.createTransport({
      host: this.configService.get<string>('MAIL_HOST', 'smtp.gmail.com'),
      port: parseInt(this.configService.get<string>('MAIL_PORT', '587')),
      secure: this.configService.get<string>('MAIL_SECURE', 'false') === 'true',
      auth: {
        user: this.configService.get<string>('MAIL_USER'),
        pass: this.configService.get<string>('MAIL_PASS'),
      },
    });
  }

  private get fromAddress(): string {
    const name = this.configService.get<string>('MAIL_FROM_NAME', 'Aimalya');
    const email = this.configService.get<string>('MAIL_FROM_EMAIL', 'noreply@aimalya.com');
    return `"${name}" <${email}>`;
  }

  async sendVerificationCode(to: string, code: string): Promise<void> {
    const html = `
      <!DOCTYPE html>
      <html>
        <head><meta charset="UTF-8" /></head>
        <body style="font-family:Arial,sans-serif;background:#f4f4f4;padding:40px 0;">
          <div style="max-width:500px;margin:auto;background:#fff;border-radius:10px;padding:40px;box-shadow:0 2px 8px rgba(0,0,0,0.08);">
            <h2 style="color:#4f46e5;margin-bottom:8px;">Verify Your Email</h2>
            <p style="color:#555;margin-top:0;">Welcome to <strong>Aimalya</strong>! Use the code below to verify your email address.</p>
            <div style="text-align:center;margin:30px 0;">
              <span style="display:inline-block;background:#4f46e5;color:#fff;font-size:32px;font-weight:bold;letter-spacing:8px;padding:16px 32px;border-radius:8px;">${code}</span>
            </div>
            <p style="color:#888;font-size:13px;">This code expires in <strong>10 minutes</strong>. Do not share it with anyone.</p>
            <hr style="border:none;border-top:1px solid #eee;margin:24px 0;" />
            <p style="color:#aaa;font-size:12px;text-align:center;">© ${new Date().getFullYear()} Aimalya. All rights reserved.</p>
          </div>
        </body>
      </html>
    `;

    await this.transporter.sendMail({
      from: this.fromAddress,
      to,
      subject: 'Welcome to Aimalya — Verify Your Email',
      html,
    });

    this.logger.log(`Verification email sent to ${to}`);
  }

  async sendPasswordReset(to: string, code: string): Promise<void> {
    const html = `
      <!DOCTYPE html>
      <html>
        <head><meta charset="UTF-8" /></head>
        <body style="font-family:Arial,sans-serif;background:#f4f4f4;padding:40px 0;">
          <div style="max-width:500px;margin:auto;background:#fff;border-radius:10px;padding:40px;box-shadow:0 2px 8px rgba(0,0,0,0.08);">
            <h2 style="color:#dc2626;margin-bottom:8px;">Password Reset Request</h2>
            <p style="color:#555;margin-top:0;">We received a request to reset your <strong>Aimalya</strong> account password. Use the code below.</p>
            <div style="text-align:center;margin:30px 0;">
              <span style="display:inline-block;background:#dc2626;color:#fff;font-size:32px;font-weight:bold;letter-spacing:8px;padding:16px 32px;border-radius:8px;">${code}</span>
            </div>
            <p style="color:#888;font-size:13px;">This code expires in <strong>10 minutes</strong>. If you didn't request this, ignore this email.</p>
            <hr style="border:none;border-top:1px solid #eee;margin:24px 0;" />
            <p style="color:#aaa;font-size:12px;text-align:center;">© ${new Date().getFullYear()} Aimalya. All rights reserved.</p>
          </div>
        </body>
      </html>
    `;

    await this.transporter.sendMail({
      from: this.fromAddress,
      to,
      subject: 'Aimalya — Password Reset Request',
      html,
    });

    this.logger.log(`Password reset email sent to ${to}`);
  }

  async sendContactInquiry(to: string, inquiryData: { name: string, email: string, subject: string, description: string, siteName: string }): Promise<void> {
    const html = `
      <!DOCTYPE html>
      <html>
        <head><meta charset="UTF-8" /></head>
        <body style="font-family:Arial,sans-serif;background:#f4f4f4;padding:40px 0;">
          <div style="max-width:600px;margin:auto;background:#fff;border-radius:10px;padding:40px;box-shadow:0 2px 8px rgba(0,0,0,0.08);">
            <h2 style="color:#4f46e5;margin-bottom:16px;">New Inquiry for ${inquiryData.siteName}</h2>
            <div style="background:#f9fafb;padding:20px;border-radius:8px;margin-bottom:20px;">
              <p style="margin:0 0 10px 0;"><strong>Name:</strong> ${inquiryData.name}</p>
              <p style="margin:0 0 10px 0;"><strong>Email:</strong> ${inquiryData.email}</p>
              <p style="margin:0 0 10px 0;"><strong>Subject:</strong> ${inquiryData.subject}</p>
            </div>
            <div style="background:#fff;border:1px solid #e5e7eb;padding:20px;border-radius:8px;">
              <p style="margin:0 0 10px 0;"><strong>Description:</strong></p>
              <p style="margin:0;color:#374151;white-space:pre-wrap;">${inquiryData.description}</p>
            </div>
            <hr style="border:none;border-top:1px solid #eee;margin:24px 0;" />
            <p style="color:#aaa;font-size:12px;text-align:center;">© ${new Date().getFullYear()} ${inquiryData.siteName}. All rights reserved.</p>
          </div>
        </body>
      </html>
    `;

    await this.transporter.sendMail({
      from: this.fromAddress,
      to,
      replyTo: inquiryData.email,
      subject: `[${inquiryData.siteName}] Inquiry: ${inquiryData.subject}`,
      html,
    });

    this.logger.log(`Contact inquiry email sent to ${to}`);
  }

  async sendPaymentNotification(to: string, paymentData: { customerName: string, customerEmail: string, plan: string, amount: number }): Promise<void> {
    const html = `
      <!DOCTYPE html>
      <html>
        <head><meta charset="UTF-8" /></head>
        <body style="font-family:Arial,sans-serif;background:#f4f4f4;padding:40px 0;">
          <div style="max-width:600px;margin:auto;background:#fff;border-radius:10px;padding:40px;box-shadow:0 2px 8px rgba(0,0,0,0.08);">
            <h2 style="color:#10b981;margin-bottom:16px;">💰 New Payment Received</h2>
            <div style="background:#f9fafb;padding:20px;border-radius:8px;margin-bottom:20px;">
              <p style="margin:0 0 10px 0;"><strong>Customer:</strong> ${paymentData.customerName}</p>
              <p style="margin:0 0 10px 0;"><strong>Email:</strong> ${paymentData.customerEmail}</p>
              <p style="margin:0 0 10px 0;"><strong>Plan:</strong> ${paymentData.plan}</p>
              <p style="margin:0 0 10px 0;"><strong>Amount Paid:</strong> $${paymentData.amount}</p>
            </div>
            <p style="color:#555;">A new subscription has been successfully processed.</p>
            <hr style="border:none;border-top:1px solid #eee;margin:24px 0;" />
            <p style="color:#aaa;font-size:12px;text-align:center;">© ${new Date().getFullYear()} Aimalya. All rights reserved.</p>
          </div>
        </body>
      </html>
    `;

    await this.transporter.sendMail({
      from: this.fromAddress,
      to,
      subject: `[Aimalya] New Payment Received: $${paymentData.amount}`,
      html,
    });

    this.logger.log(`Payment notification email sent to ${to}`);
  }

  async sendMonthlyReportEmail(
    to: string,
    businessName: string,
    reportData: {
      report_title: string;
      period: string;
      executive_summary: string;
      kpis: {
        avg_rating: { value: number; change: any };
        reviews: { value: number; change: any };
        satisfaction: { value: number; change: any };
        response_rate: { value: number | null; change: any };
      };
      sentiment_breakdown: {
        positive: { percent: number; count: number };
        neutral: { percent: number; count: number };
        negative: { percent: number; count: number };
      };
      top_complaints: { issue: string; mentions: number }[];
      top_praises: { strength: string; mentions: number }[];
      action_plan: string[];
    }
  ): Promise<void> {
    const { report_title, period, executive_summary, kpis, sentiment_breakdown, top_complaints, top_praises, action_plan } = reportData;

    const praisesHtml = top_praises && top_praises.length > 0 
      ? top_praises.map(p => `<li style="margin-bottom:8px;"><strong>${p.strength}</strong> (${p.mentions} mentions)</li>`).join('')
      : '<li style="color:#888;">No positive mentions registered this period.</li>';

    const complaintsHtml = top_complaints && top_complaints.length > 0 
      ? top_complaints.map(c => `<li style="margin-bottom:8px;"><strong>${c.issue}</strong> (${c.mentions} mentions)</li>`).join('')
      : '<li style="color:#888;">No complaints registered this period.</li>';

    const actionPlanHtml = action_plan && action_plan.length > 0 
      ? action_plan.map(item => `<li style="margin-bottom:12px;background:#f9fafb;padding:12px;border-radius:6px;list-style:none;border-left:4px solid #4f46e5;">${item}</li>`).join('')
      : '<li style="color:#888;list-style:none;">No specific action plan suggested for this period.</li>';

    const html = `
      <!DOCTYPE html>
      <html>
        <head>
          <meta charset="UTF-8" />
          <title>${report_title}</title>
        </head>
        <body style="font-family: 'Segoe UI', Tahoma, Geneva, Verdana, sans-serif; background-color: #f3f4f6; margin: 0; padding: 0;">
          <div style="max-width: 650px; margin: 40px auto; background-color: #ffffff; border-radius: 12px; overflow: hidden; box-shadow: 0 4px 20px rgba(0,0,0,0.05); border: 1px solid #e5e7eb;">
            <!-- Header -->
            <div style="background: linear-gradient(135deg, #4f46e5 0%, #3b82f6 100%); padding: 35px; text-align: center; color: #ffffff;">
              <span style="background: rgba(255,255,255,0.15); padding: 6px 12px; border-radius: 20px; font-size: 12px; text-transform: uppercase; letter-spacing: 1px; font-weight: bold;">Monthly Performance Report</span>
              <h1 style="margin: 15px 0 5px 0; font-size: 26px; font-weight: 800;">${businessName}</h1>
              <p style="margin: 0; font-size: 14px; opacity: 0.9;">Period: ${period}</p>
            </div>

            <!-- Body -->
            <div style="padding: 35px;">
              <!-- Executive Summary -->
              <div style="background-color: #eff6ff; border-left: 5px solid #3b82f6; padding: 20px; border-radius: 8px; margin-bottom: 30px;">
                <h3 style="margin: 0 0 10px 0; color: #1e3a8a; font-size: 16px; font-weight: bold;">📝 Executive Summary</h3>
                <p style="margin: 0; color: #1e40af; font-size: 14px; line-height: 1.6;">${executive_summary}</p>
              </div>

              <!-- KPIs Grid -->
              <h3 style="margin: 0 0 15px 0; color: #111827; font-size: 16px; border-bottom: 2px solid #f3f4f6; padding-bottom: 8px;">📊 Key Performance Indicators</h3>
              <div style="display: table; width: 100%; margin-bottom: 30px;">
                <div style="display: table-row;">
                  <div style="display: table-cell; width: 50%; padding-right: 10px; padding-bottom: 20px;">
                    <div style="background-color: #f9fafb; padding: 15px; border-radius: 8px; border: 1px solid #f3f4f6; text-align: center;">
                      <span style="font-size: 12px; color: #6b7280; font-weight: bold; text-transform: uppercase;">Average Rating</span>
                      <div style="font-size: 28px; font-weight: 800; color: #111827; margin: 5px 0;">⭐ ${kpis.avg_rating.value} / 5</div>
                    </div>
                  </div>
                  <div style="display: table-cell; width: 50%; padding-left: 10px; padding-bottom: 20px;">
                    <div style="background-color: #f9fafb; padding: 15px; border-radius: 8px; border: 1px solid #f3f4f6; text-align: center;">
                      <span style="font-size: 12px; color: #6b7280; font-weight: bold; text-transform: uppercase;">Review Count</span>
                      <div style="font-size: 28px; font-weight: 800; color: #111827; margin: 5px 0;">💬 ${kpis.reviews.value}</div>
                    </div>
                  </div>
                </div>
                <div style="display: table-row;">
                  <div style="display: table-cell; width: 50%; padding-right: 10px;">
                    <div style="background-color: #f9fafb; padding: 15px; border-radius: 8px; border: 1px solid #f3f4f6; text-align: center;">
                      <span style="font-size: 12px; color: #6b7280; font-weight: bold; text-transform: uppercase;">Satisfaction Rate</span>
                      <div style="font-size: 28px; font-weight: 800; color: #10b981; margin: 5px 0;">📈 ${kpis.satisfaction.value}%</div>
                    </div>
                  </div>
                  <div style="display: table-cell; width: 50%; padding-left: 10px;">
                    <div style="background-color: #f9fafb; padding: 15px; border-radius: 8px; border: 1px solid #f3f4f6; text-align: center;">
                      <span style="font-size: 12px; color: #6b7280; font-weight: bold; text-transform: uppercase;">Response Rate</span>
                      <div style="font-size: 28px; font-weight: 800; color: #3b82f6; margin: 5px 0;">
                        ${kpis.response_rate.value !== null ? `${kpis.response_rate.value}%` : 'N/A'}
                      </div>
                    </div>
                  </div>
                </div>
              </div>

              <!-- Sentiment Breakdown -->
              <h3 style="margin: 0 0 15px 0; color: #111827; font-size: 16px; border-bottom: 2px solid #f3f4f6; padding-bottom: 8px;">❤️ Sentiment Distribution</h3>
              <div style="background: #f9fafb; padding: 20px; border-radius: 8px; margin-bottom: 30px;">
                <div style="margin-bottom: 12px;">
                  <span style="font-size: 13px; font-weight: bold; color: #10b981;">Positive (${sentiment_breakdown.positive.count} reviews)</span>
                  <div style="background: #e5e7eb; height: 10px; border-radius: 5px; margin-top: 5px;">
                    <div style="background: #10b981; height: 10px; border-radius: 5px; width: ${sentiment_breakdown.positive.percent}%;"></div>
                  </div>
                </div>
                <div style="margin-bottom: 12px;">
                  <span style="font-size: 13px; font-weight: bold; color: #f59e0b;">Neutral (${sentiment_breakdown.neutral.count} reviews)</span>
                  <div style="background: #e5e7eb; height: 10px; border-radius: 5px; margin-top: 5px;">
                    <div style="background: #f59e0b; height: 10px; border-radius: 5px; width: ${sentiment_breakdown.neutral.percent}%;"></div>
                  </div>
                </div>
                <div>
                  <span style="font-size: 13px; font-weight: bold; color: #ef4444;">Negative (${sentiment_breakdown.negative.count} reviews)</span>
                  <div style="background: #e5e7eb; height: 10px; border-radius: 5px; margin-top: 5px;">
                    <div style="background: #ef4444; height: 10px; border-radius: 5px; width: ${sentiment_breakdown.negative.percent}%;"></div>
                  </div>
                </div>
              </div>

              <!-- Praises and Complaints -->
              <div style="display: table; width: 100%; margin-bottom: 30px;">
                <div style="display: table-row;">
                  <div style="display: table-cell; width: 50%; padding-right: 15px; vertical-align: top;">
                    <h4 style="margin: 0 0 10px 0; color: #10b981; font-size: 14px;">🟢 Top Praise Highlights</h4>
                    <ul style="margin: 0; padding-left: 18px; color: #4b5563; font-size: 13px; line-height: 1.5;">
                      ${praisesHtml}
                    </ul>
                  </div>
                  <div style="display: table-cell; width: 50%; padding-left: 15px; vertical-align: top;">
                    <h4 style="margin: 0 0 10px 0; color: #ef4444; font-size: 14px;">🔴 Top Area Improvements</h4>
                    <ul style="margin: 0; padding-left: 18px; color: #4b5563; font-size: 13px; line-height: 1.5;">
                      ${complaintsHtml}
                    </ul>
                  </div>
                </div>
              </div>

              <!-- Recommended Action Plan -->
              <h3 style="margin: 0 0 15px 0; color: #111827; font-size: 16px; border-bottom: 2px solid #f3f4f6; padding-bottom: 8px;">🚀 Recommended Action Plan</h3>
              <ul style="margin: 0; padding: 0;">
                ${actionPlanHtml}
              </ul>
            </div>

            <!-- Footer -->
            <div style="background-color: #f9fafb; border-top: 1px solid #e5e7eb; padding: 25px; text-align: center; color: #9ca3af; font-size: 12px;">
              <p style="margin: 0 0 5px 0;">You received this email because you subscribed to Monthly Performance Reports for ${businessName}.</p>
              <p style="margin: 0;">© ${new Date().getFullYear()} Aimalya. All rights reserved.</p>
            </div>
          </div>
        </body>
      </html>
    `;

    await this.transporter.sendMail({
      from: this.fromAddress,
      to,
      subject: `📊 Monthly Analysis Report: ${businessName} (${period})`,
      html,
    });

    this.logger.log(`Monthly analysis report email sent to ${to}`);
  }

  async sendRatingAlertEmail(
    to: string,
    businessName: string,
    address: string,
    ratingData: {
      ratingChange: number;
      currentRating: number;
      previousRating: number;
      isDrop: boolean;
      isRise: boolean;
    }
  ): Promise<void> {
    const { ratingChange, currentRating, previousRating, isDrop, isRise } = ratingData;
    const direction = isDrop ? 'Dropped' : 'Increased';
    const directionEmoji = isDrop ? '⚠️' : '🚀';
    const accentColor = isDrop ? '#ef4444' : '#10b981';
    const changeText = isDrop 
      ? `dropped by ${Math.abs(ratingChange).toFixed(2)} points` 
      : `increased by ${ratingChange.toFixed(2)} points`;

    const html = `
      <!DOCTYPE html>
      <html>
        <head>
          <meta charset="UTF-8" />
          <title>Rating Alert - ${businessName}</title>
        </head>
        <body style="font-family: 'Segoe UI', Tahoma, Geneva, Verdana, sans-serif; background-color: #f3f4f6; margin: 0; padding: 0;">
          <div style="max-width: 600px; margin: 40px auto; background-color: #ffffff; border-radius: 12px; overflow: hidden; box-shadow: 0 4px 20px rgba(0,0,0,0.05); border: 1px solid #e5e7eb;">
            <!-- Header -->
            <div style="background: linear-gradient(135deg, ${accentColor} 0%, #3b82f6 100%); padding: 35px; text-align: center; color: #ffffff;">
              <span style="background: rgba(255,255,255,0.15); padding: 6px 12px; border-radius: 20px; font-size: 12px; text-transform: uppercase; letter-spacing: 1px; font-weight: bold;">Important Rating Alert</span>
              <h1 style="margin: 15px 0 5px 0; font-size: 24px; font-weight: 800;">${directionEmoji} Rating ${direction}!</h1>
              <p style="margin: 0; font-size: 14px; opacity: 0.9;">Business: ${businessName} at ${address}</p>
            </div>

            <!-- Body -->
            <div style="padding: 35px;">
              <p style="color: #374151; font-size: 15px; line-height: 1.6; margin-top: 0;">
                Hello,
              </p>
              <p style="color: #374151; font-size: 15px; line-height: 1.6;">
                We detected that the average rating for <strong>${businessName}</strong> located at <em>${address}</em> has <strong>${changeText}</strong>.
              </p>

              <!-- Comparison Block -->
              <div style="background-color: #f9fafb; border: 1px solid #e5e7eb; border-radius: 8px; padding: 25px; margin: 30px 0; text-align: center;">
                <div style="display: table; width: 100%;">
                  <div style="display: table-row;">
                    <div style="display: table-cell; width: 45%; vertical-align: middle;">
                      <span style="font-size: 12px; color: #6b7280; font-weight: bold; text-transform: uppercase;">Previous Rating</span>
                      <div style="font-size: 26px; font-weight: 800; color: #4b5563; margin-top: 5px;">⭐ ${previousRating.toFixed(2)}</div>
                    </div>
                    <div style="display: table-cell; width: 10%; vertical-align: middle; font-size: 24px; color: #9ca3af;">
                      ➡️
                    </div>
                    <div style="display: table-cell; width: 45%; vertical-align: middle;">
                      <span style="font-size: 12px; color: #6b7280; font-weight: bold; text-transform: uppercase;">Current Rating</span>
                      <div style="font-size: 26px; font-weight: 800; color: ${accentColor}; margin-top: 5px;">⭐ ${currentRating.toFixed(2)}</div>
                    </div>
                  </div>
                </div>
              </div>

              <p style="color: #374151; font-size: 14px; line-height: 1.6; margin-bottom: 0;">
                Please check your business dashboard to analyze individual reviews and respond to your customers immediately.
              </p>
            </div>

            <!-- Footer -->
            <div style="background-color: #f9fafb; border-top: 1px solid #e5e7eb; padding: 25px; text-align: center; color: #9ca3af; font-size: 12px;">
              <p style="margin: 0 0 5px 0;">You received this email because you subscribed to Important Alerts for ${businessName}.</p>
              <p style="margin: 0;">© ${new Date().getFullYear()} Aimalya. All rights reserved.</p>
            </div>
          </div>
        </body>
      </html>
    `;

    await this.transporter.sendMail({
      from: this.fromAddress,
      to,
      subject: `${directionEmoji} Rating Alert: ${businessName} rating has ${direction.toLowerCase()}`,
      html,
    });

    this.logger.log(`Rating alert email sent to ${to} for ${businessName}`);
  }

  async sendAdminWelcome(to: string, data: { name: string; email: string; password: string }): Promise<void> {
    const html = `
      <!DOCTYPE html>
      <html>
        <head><meta charset="UTF-8" /></head>
        <body style="font-family:'Segoe UI',Arial,sans-serif;background:#f3f4f6;margin:0;padding:0;">
          <div style="max-width:560px;margin:40px auto;background:#ffffff;border-radius:12px;overflow:hidden;box-shadow:0 4px 20px rgba(0,0,0,0.07);border:1px solid #e5e7eb;">
            <!-- Header -->
            <div style="background:linear-gradient(135deg,#4f46e5 0%,#7c3aed 100%);padding:36px;text-align:center;color:#fff;">
              <div style="font-size:44px;margin-bottom:10px;">🛡️</div>
              <h1 style="margin:0 0 6px 0;font-size:24px;font-weight:800;letter-spacing:-0.5px;">Welcome to Aimalya Admin</h1>
              <p style="margin:0;font-size:14px;opacity:0.85;">Your admin account has been created successfully</p>
            </div>

            <!-- Body -->
            <div style="padding:36px;">
              <p style="color:#374151;font-size:15px;line-height:1.6;margin-top:0;">
                Hi <strong>${data.name}</strong>,
              </p>
              <p style="color:#374151;font-size:15px;line-height:1.6;">
                An admin account has been created for you on <strong>Aimalya</strong>. Below are your login credentials. Please log in and change your password immediately.
              </p>

              <!-- Credentials Box -->
              <div style="background:#f9fafb;border:1px solid #e5e7eb;border-radius:10px;padding:24px;margin:28px 0;">
                <h3 style="margin:0 0 16px 0;color:#111827;font-size:15px;font-weight:700;">🔐 Your Login Credentials</h3>
                <table style="width:100%;border-collapse:collapse;">
                  <tr>
                    <td style="padding:10px 0;color:#6b7280;font-size:13px;font-weight:600;width:100px;">Name</td>
                    <td style="padding:10px 0;color:#111827;font-size:14px;font-weight:500;">${data.name}</td>
                  </tr>
                  <tr style="border-top:1px solid #f3f4f6;">
                    <td style="padding:10px 0;color:#6b7280;font-size:13px;font-weight:600;">Email</td>
                    <td style="padding:10px 0;color:#111827;font-size:14px;font-weight:500;">${data.email}</td>
                  </tr>
                  <tr style="border-top:1px solid #f3f4f6;">
                    <td style="padding:10px 0;color:#6b7280;font-size:13px;font-weight:600;">Password</td>
                    <td style="padding:10px 0;">
                      <span style="display:inline-block;background:#4f46e5;color:#fff;font-family:monospace;font-size:15px;font-weight:bold;padding:8px 16px;border-radius:6px;letter-spacing:1px;">${data.password}</span>
                    </td>
                  </tr>
                </table>
              </div>

              <div style="background:#fef3c7;border-left:4px solid #f59e0b;padding:14px 18px;border-radius:6px;margin-bottom:24px;">
                <p style="margin:0;color:#92400e;font-size:13px;">⚠️ <strong>Security Notice:</strong> Please log in and change your password immediately. Do not share these credentials with anyone.</p>
              </div>

              <p style="color:#6b7280;font-size:13px;margin-bottom:0;">If you did not expect this email, please contact your system administrator.</p>
            </div>

            <!-- Footer -->
            <div style="background:#f9fafb;border-top:1px solid #e5e7eb;padding:20px;text-align:center;">
              <p style="margin:0;color:#9ca3af;font-size:12px;">© ${new Date().getFullYear()} Aimalya. All rights reserved.</p>
            </div>
          </div>
        </body>
      </html>
    `;

    await this.transporter.sendMail({
      from: this.fromAddress,
      to,
      subject: '🛡️ Welcome to Aimalya — Your Admin Account Details',
      html,
    });

    this.logger.log(`Admin welcome email sent to ${to}`);
  }
}

