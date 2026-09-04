import { Injectable, Logger } from '@nestjs/common';
import { PrismaService } from '../../prisma/prisma.service';
import { NotificationService } from '../notification/notification.service';
import { NotificationGateway } from '../notification/notification.gateway';
import { MailService } from '../mail/mail.service';
import { NotificationStatus } from '@prisma/client';
import { Cron, CronExpression } from '@nestjs/schedule';
import { ConfigService } from '@nestjs/config';

@Injectable()
export class AutoAnalysesService {
  private readonly logger = new Logger(AutoAnalysesService.name);

  constructor(
    private readonly prisma: PrismaService,
    private readonly notificationService: NotificationService,
    private readonly notificationGateway: NotificationGateway,
    private readonly mailService: MailService,
    private readonly configService: ConfigService,
  ) { }


  @Cron(CronExpression.EVERY_HOUR)
  async handleEveryHourCron() {
    this.logger.log('🚀 Every-Hour Cron Job triggered: Dynamic scheduling cycle initiated...');
    try {
      await this.triggerAnalyses();
    } catch (error) {
      this.logger.error('Every-Hour Cron Job failed:', error.message);
    }
  }


  private async fetchUsersWithSettings(): Promise<any[]> {
    try {
      const users = await this.prisma.user.findMany({
        include: { notificationSettings: true },
      });
      this.logger.log(`Found ${users.length} local users to process.`);
      return users;
    } catch (error) {
      this.logger.error('Error fetching local users:', error.message);
      throw error;
    }
  }

  private async fetchUserBusinesses(ownerId: string, email: string): Promise<any[]> {
    const baseBusinessesUrl = this.configService.get<string>('ANALYTICS_BUSINESSES_URL', 'http://13.63.11.191:8000/businesses');
    const fetchUrl = `${baseBusinessesUrl}?user_id=${encodeURIComponent(ownerId)}`;
    this.logger.log(`Fetching businesses for user "${email}" (${ownerId}) from: ${fetchUrl}`);

    const response = await fetch(fetchUrl);
    if (!response.ok) {
      throw new Error(`Failed to fetch businesses for user ${ownerId}: ${response.statusText}`);
    }
    const data = await response.json();
    return Array.isArray(data) ? data : data.businesses || [];
  }

  private async generateReport(
    ownerId: string,
    businessName: string,
    locationAddress: string,
    isWeekly: boolean,
    userEmail: string,
  ): Promise<any | null> {
    const today = new Date();
    const endDate = this.formatDate(today);

    let startDate: string;
    const frequency = isWeekly ? 'weekly' : 'monthly';
    if (isWeekly) {
      const last7Days = new Date();
      last7Days.setDate(today.getDate() - 7);
      startDate = this.formatDate(last7Days);
    } else {
      const last1Month = new Date();
      last1Month.setMonth(today.getMonth() - 1);
      startDate = this.formatDate(last1Month);
    }

    // Fetch raw report data via existing helper
    const rawReport = await this.fetchReportData(ownerId, businessName, frequency, startDate, endDate, locationAddress, userEmail);
    if (!rawReport) {
      return null;
    }

    // Standardize/Parse via existing helper
    return this.parseAndStandardizeReport(rawReport, businessName, startDate, endDate);
  }

  private async sendReport(
    ownerId: string,
    businessName: string,
    locationAddress: string,
    report: any,
    settings: any,
    userEmail: string,
  ): Promise<{ inAppCreated: boolean; emailSent: boolean }> {
    const wantsInApp = settings.inAppMonthlyReport;
    const wantsEmail = settings.emailMonthlyReports || settings.emailWeeklySummary;

    // Create in-app notification
    const inAppCreated = await this.createInAppNotification(ownerId, businessName, locationAddress, report, wantsInApp);

    // Send email report
    const emailSent = await this.sendEmailReport(userEmail, businessName, locationAddress, report, wantsEmail);

    return { inAppCreated, emailSent };
  }

  private async checkRatingDropOrRise(
    ownerId: string,
    businessName: string,
    locationAddress: string,
    isWeekly: boolean,
  ): Promise<{ ratingChange: number; currentRating: number; previousRating: number; isDrop: boolean; isRise: boolean } | null> {
    const frequency = isWeekly ? 'weekly' : 'monthly';
    const baseDropUrl = this.configService.get<string>('ANALYTICS_RATING_DROP_URL', 'http://13.63.11.191:8000/businesses/management/rating-drop');
    const fetchUrl = `${baseDropUrl}?user_id=${encodeURIComponent(ownerId)}&business_name=${encodeURIComponent(businessName)}&location=${encodeURIComponent(locationAddress)}&report_frequency=${frequency}`;

    try {
      this.logger.log(`Checking rating drop/rise from: ${fetchUrl}`);
      const response = await fetch(fetchUrl);
      if (!response.ok) {
        throw new Error(`Rating drop API responded with status ${response.status}`);
      }
      const data = await response.json();
      this.logger.log(`Rating drop API response: ${JSON.stringify(data)}`);
      
      const ratingChange = data.rating_change ?? data.change ?? 0;
      const currentRating = data.current_rating ?? data.current ?? 0;
      const previousRating = data.previous_rating ?? data.previous ?? 0;
      
      const isDrop = data.is_drop ?? (ratingChange < 0);
      const isRise = data.is_rose ?? data.is_rise ?? (ratingChange > 0);

      return {
        ratingChange,
        currentRating,
        previousRating,
        isDrop,
        isRise,
      };
    } catch (error) {
      this.logger.error(`Error checking rating drop/rise for "${businessName}" at "${locationAddress}": ${error.message}`);
      return null;
    }
  }

  private async handleRatingAlerts(
    ownerId: string,
    businessName: string,
    locationAddress: string,
    settings: any,
    userEmail: string,
    isWeekly: boolean,
  ): Promise<{ inAppAlertCreated: boolean; emailAlertSent: boolean }> {
    const results = { inAppAlertCreated: false, emailAlertSent: false };
    const checkRatingAlerts = settings.inAppRatingDrop || settings.emailImportantAlerts;
    if (!checkRatingAlerts) return results;

    const ratingAlert = await this.checkRatingDropOrRise(ownerId, businessName, locationAddress, isWeekly);
    if (!ratingAlert) return results;

    // 1. In-app notification on drop
    if (settings.inAppRatingDrop && ratingAlert.isDrop) {
      try {
        const notification = await this.notificationService.create({
          status: NotificationStatus.REPORT,
          title: `⚠️ Rating Drop Alert: ${businessName} (${locationAddress})`,
          description: `Average rating has dropped by ${Math.abs(ratingAlert.ratingChange).toFixed(2)} points to ${ratingAlert.currentRating} (previously ${ratingAlert.previousRating}).`,
          userId: ownerId,
        });

        this.notificationGateway.sendNotification(ownerId, 'ratingDropAlert', {
          notificationId: notification.notificationId,
          status: notification.status,
          title: notification.title,
          description: notification.description,
          createdAt: notification.createdAt,
          ratingAlert,
        });
        results.inAppAlertCreated = true;
      } catch (error) {
        this.logger.error(`Failed to create in-app notification for rating drop of "${businessName}": ${error.message}`);
      }
    }

    // 2. Email alert on drop or rise
    if (settings.emailImportantAlerts && (ratingAlert.isDrop || ratingAlert.isRise)) {
      try {
        await this.mailService.sendRatingAlertEmail(userEmail, businessName, locationAddress, ratingAlert);
        results.emailAlertSent = true;
      } catch (error) {
        this.logger.error(`Failed to send rating alert email for "${businessName}": ${error.message}`);
      }
    }

    return results;
  }

  async triggerAnalyses(): Promise<any> {
    this.logger.log('🚀 Starting Automated Automated Analyses Cycle...');
    const results = {
      processed_businesses: 0,
      processed_locations: 0,
      notifications_created: 0,
      emails_sent: 0,
      errors: [] as string[],
    };

    // 1. Fetch all local users with their notification settings
    let users: any[] = [];
    try {
      users = await this.fetchUsersWithSettings();
    } catch (error) {
      results.errors.push(`Local user query failed: ${error.message}`);
      return results;
    }

    // 2. Loop through each user to check their notification setup and fetch their specific businesses
    for (const user of users) {
      const ownerId = user.userId;
      const settings = user.notificationSettings || {
        emailMonthlyReports: false,
        inAppMonthlyReport: false,
        emailWeeklySummary: false,
        inAppRatingDrop: false,
        emailImportantAlerts: false,
      };

      const wantsInApp = settings.inAppMonthlyReport;
      const wantsEmail = settings.emailMonthlyReports || settings.emailWeeklySummary;
      const checkRatingAlerts = settings.inAppRatingDrop || settings.emailImportantAlerts;

      // Skip this user entirely if they have turned off all reports and alerts
      if (!wantsInApp && !wantsEmail && !checkRatingAlerts) {
        continue;
      }

      // Fetch this specific user's businesses
      let userBusinesses: any[] = [];
      try {
        userBusinesses = await this.fetchUserBusinesses(ownerId, user.email);
      } catch (error) {
        this.logger.error(`Error retrieving businesses for user "${user.email}": ${error.message}`);
        results.errors.push(`Error fetching businesses for user "${user.email}": ${error.message}`);
        continue;
      }

      // 3. Process each business owned by this user
      for (const business of userBusinesses) {
        const businessName = business.business_name;
        if (!businessName) {
          this.logger.warn(`Skipping a business entry for user "${user.email}" because business_name is missing.`);
          continue;
        }

        results.processed_businesses++;

        // DYNAMIC SCHEDULING: Check which report interval to use (30 days monthly, 7 days weekly)
        let intervalMinutes = 43200; // 30 days in minutes (30 * 24 * 60)
        let isWeekly = false;

        if (settings.emailWeeklySummary && !settings.emailMonthlyReports && !settings.inAppMonthlyReport) {
          intervalMinutes = 10080; // 7 days in minutes (7 * 24 * 60)
          isWeekly = true;
        }

        const latestReportNotification = await this.prisma.notification.findFirst({
          where: {
            userId: ownerId,
            status: NotificationStatus.REPORT,
            title: {
              contains: businessName,
              mode: 'insensitive',
            },
          },
          orderBy: {
            createdAt: 'desc',
          },
        });

        // Fetch the locations for this business
        const locations = await this.fetchBusinessLocations(ownerId, businessName);
        if (locations.length === 0) {
          this.logger.warn(`⚠️ No locations found for business "${businessName}" (Owner: ${user.email}). Skipping...`);
          continue;
        }

        // Process each location separately
        for (const location of locations) {
          const locationAddress = location.address || location.location_address || location.formatted_address || location.input_address || 'Uttara';
          results.processed_locations++;

          try {
            // Check if report interval has elapsed (or if no report has been created yet)
            let isReportDue = false;
            if (wantsInApp || wantsEmail) {
              if (!latestReportNotification) {
                isReportDue = true;
              } else {
                const msSinceLast = Date.now() - new Date(latestReportNotification.createdAt).getTime();
                const minutesSinceLast = msSinceLast / (1000 * 60);
                if (minutesSinceLast >= intervalMinutes) {
                  isReportDue = true;
                } else {
                  this.logger.log(`️⏳ ${isWeekly ? 'Weekly' : 'Monthly'} report for "${businessName}" (Owner: ${user.email}) is not due yet. Only ${minutesSinceLast.toFixed(2)} minutes elapsed since last report (${intervalMinutes} required in dev). Skipping report generation...`);
                }
              }
            }

            // A. General Reports Dispatches
            if (isReportDue) {
              if (isWeekly) {
                this.logger.log(`Creating a Weekly Report for "${businessName}" at "${locationAddress}"...`);
              } else {
                this.logger.log(`Creating a Monthly Report for "${businessName}" at "${locationAddress}"...`);
              }

              // Generate report (fetches and standardizes)
              const report = await this.generateReport(ownerId, businessName, locationAddress, isWeekly, user.email);
              if (report) {
                // Send report (creates in-app / email as configured)
                const { inAppCreated, emailSent } = await this.sendReport(ownerId, businessName, locationAddress, report, settings, user.email);
                
                if (inAppCreated) {
                  results.notifications_created++;
                }
                if (emailSent) {
                  results.emails_sent++;
                }
              }
            }

            // B. Rating Alerts Dispatches (checked in real-time on every analysis cycle)
            if (checkRatingAlerts) {
              const { inAppAlertCreated, emailAlertSent } = await this.handleRatingAlerts(
                ownerId,
                businessName,
                locationAddress,
                settings,
                user.email,
                isWeekly,
              );

              if (inAppAlertCreated) {
                results.notifications_created++;
              }
              if (emailAlertSent) {
                results.emails_sent++;
              }
            }

          } catch (error) {
            this.logger.error(`Error processing report/alerts for "${businessName}" at "${locationAddress}" (Owner: ${ownerId}): ${error.message}`, error.stack);
            results.errors.push(`Error for "${businessName}" at "${locationAddress}": ${error.message}`);
          }
        }
      }
    }

    this.logger.log(`Finished Automated Analyses Cycle. Processed: ${results.processed_businesses} businesses, ${results.processed_locations} locations. Created: ${results.notifications_created} notifications, Sent: ${results.emails_sent} emails.`);
    return results;
  }

  private async fetchBusinessLocations(ownerId: string, businessName: string): Promise<any[]> {
    const baseLocationsUrl = this.configService.get<string>('ANALYTICS_LOCATIONS_URL', 'http://13.63.11.191:8000/businesses/locations');
    const fetchUrl = `${baseLocationsUrl}?user_id=${encodeURIComponent(ownerId)}&business_name=${encodeURIComponent(businessName)}`;

    try {
      this.logger.log(`Fetching locations for business "${businessName}" from: ${fetchUrl}`);
      const response = await fetch(fetchUrl);
      if (!response.ok) {
        this.logger.warn(`Failed to fetch locations for business "${businessName}" (Status: ${response.status}).`);
        return [];
      }
      const data = await response.json();
      if (Array.isArray(data)) {
        return data;
      }
      if (data && Array.isArray(data.locations)) {
        return data.locations;
      }
      if (data && Array.isArray(data.businesses)) {
        return data.businesses;
      }
      if (data && (data.address || data.location_address || data.formatted_address || data.input_address)) {
        return [data];
      }
      return [];
    } catch (error) {
      this.logger.error(`Error fetching locations for "${businessName}": ${error.message}`);
      return [];
    }
  }

  private async fetchReportData(
    ownerId: string,
    businessName: string,
    frequency: string,
    startDate: string,
    endDate: string,
    address: string,
    userEmail: string,
  ): Promise<any | null> {
    const baseReportUrl = this.configService.get<string>('ANALYTICS_REPORTS_URL', 'http://13.63.11.191:8000/reports/monthly');
    const reportUrl = `${baseReportUrl}?user_id=${encodeURIComponent(ownerId)}&business_name=${encodeURIComponent(businessName)}&report_frequency=${frequency}&start_date=${startDate}&end_date=${endDate}&address=${encodeURIComponent(address)}`;

    try {
      this.logger.log(`Fetching report data for "${businessName}" at "${address}" from: ${reportUrl}`);
      const response = await fetch(reportUrl);
      if (!response.ok) {
        let errorDetail = '';
        try {
          const errBody = await response.json();
          errorDetail = errBody.detail || '';
        } catch (e) { }

        if (response.status === 404 || errorDetail.toLowerCase().includes('not found')) {
          this.logger.warn(`⚠️ Business/Location "${businessName}" at "${address}" not found for user "${userEmail}". Skipping gracefully...`);
          return null;
        }
        throw new Error(`Report API responded with status ${response.status}${errorDetail ? ': ' + errorDetail : ''}`);
      }
      return await response.json();
    } catch (error) {
      this.logger.error(`Error fetching report data for "${businessName}" at "${address}": ${error.message}`);
      return null;
    }
  }

  private parseAndStandardizeReport(rawReport: any, businessName: string, startDate: string, endDate: string): any {
    return {
      report_title: rawReport?.report_title || 'Performance Report',
      period: rawReport?.period || `${startDate} to ${endDate}`,
      executive_summary: rawReport?.executive_summary || `Here is your summary performance report for ${businessName}.`,
      kpis: {
        avg_rating: {
          value: typeof rawReport?.kpis?.avg_rating === 'object' ? rawReport?.kpis?.avg_rating?.value ?? 0 : rawReport?.kpis?.avg_rating ?? 0,
          change: rawReport?.kpis?.avg_rating?.change ?? 0,
        },
        reviews: {
          value: typeof rawReport?.kpis?.reviews === 'object' ? rawReport?.kpis?.reviews?.value ?? 0 : rawReport?.kpis?.reviews ?? 0,
          change: rawReport?.kpis?.reviews?.change ?? 0,
        },
        satisfaction: {
          value: typeof rawReport?.kpis?.satisfaction === 'object' ? rawReport?.kpis?.satisfaction?.value ?? 0 : rawReport?.kpis?.satisfaction ?? 0,
          change: rawReport?.kpis?.satisfaction?.change ?? 0,
        },
        response_rate: {
          value: typeof rawReport?.kpis?.response_rate === 'object' ? rawReport?.kpis?.response_rate?.value ?? null : rawReport?.kpis?.response_rate ?? null,
          change: rawReport?.kpis?.response_rate?.change ?? 0,
        },
      },
      sentiment_breakdown: {
        positive: {
          percent: rawReport?.sentiment_breakdown?.positive?.percent ?? 0,
          count: rawReport?.sentiment_breakdown?.positive?.count ?? 0,
        },
        neutral: {
          percent: rawReport?.sentiment_breakdown?.neutral?.percent ?? 0,
          count: rawReport?.sentiment_breakdown?.neutral?.count ?? 0,
        },
        negative: {
          percent: rawReport?.sentiment_breakdown?.negative?.percent ?? 0,
          count: rawReport?.sentiment_breakdown?.negative?.count ?? 0,
        },
      },
      top_complaints: Array.isArray(rawReport?.top_complaints) ? rawReport.top_complaints : [],
      top_praises: Array.isArray(rawReport?.top_praises) ? rawReport.top_praises : [],
      action_plan: Array.isArray(rawReport?.action_plan) ? rawReport.action_plan : [],
    };
  }

  private async createInAppNotification(ownerId: string, businessName: string, address: string, report: any, wantsInApp: boolean): Promise<boolean> {
    if (!wantsInApp) return false;
    try {
      const notification = await this.notificationService.create({
        status: NotificationStatus.REPORT,
        title: `Analysis Report: ${businessName} (${address})`,
        description: report.executive_summary,
        userId: ownerId,
      });

      // Broadcast in real-time
      this.notificationGateway.sendNotification(ownerId, 'analysisReport', {
        notificationId: notification.notificationId,
        status: notification.status,
        title: notification.title,
        description: notification.description,
        createdAt: notification.createdAt,
        report,
      });
      return true;
    } catch (error) {
      this.logger.error(`Failed to create in-app notification for "${businessName}" at "${address}": ${error.message}`);
      return false;
    }
  }

  private async sendEmailReport(email: string, businessName: string, address: string, report: any, wantsEmail: boolean): Promise<boolean> {
    if (!wantsEmail) return false;
    try {
      await this.mailService.sendMonthlyReportEmail(email, `${businessName} (${address})`, report);
      return true;
    } catch (error) {
      this.logger.error(`Failed to send email report for "${businessName}" at "${address}" to ${email}: ${error.message}`);
      return false;
    }
  }

  private formatDate(d: Date): string {
    const year = d.getFullYear();
    const month = String(d.getMonth() + 1).padStart(2, '0');
    const day = String(d.getDate()).padStart(2, '0');
    return `${year}-${month}-${day}`;
  }
}

