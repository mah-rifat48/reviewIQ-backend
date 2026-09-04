import { Controller, Post, Body, UnauthorizedException, Get, UseGuards, Req, Res, UseFilters } from '@nestjs/common';
import { Response } from 'express';
import { AuthGuard } from '@nestjs/passport';

import { ApiTags, ApiOperation, ApiResponse, ApiBody, ApiBearerAuth } from '@nestjs/swagger';
import { AuthService } from './auth.service';
import { RegisterDto, LoginDto, ForgotPasswordDto, ResetPasswordDto, VerificationDto } from './dto/auth.dto';
import { ChangePasswordDto } from './dto/change-password.dto';
import { Public } from '../../common/decorators/public.decorator';
import { GetUser } from '../../common/decorators/get-user.decorator';
import { GoogleOAuthExceptionFilter } from './filters/google-oauth.filter';

@ApiTags('Auth')
@ApiBearerAuth()
@Controller('auth')
export class AuthController {
  constructor(private readonly authService: AuthService) { }

  @Public()
  @Post('register')
  @ApiOperation({ summary: 'Register a new user' })
  @ApiBody({ type: RegisterDto })
  register(@Body() registerDto: RegisterDto) {
    return this.authService.register(registerDto);
  }

  @Public()
  @Post('verify')
  @ApiOperation({ summary: 'Verify email with OTP' })
  @ApiBody({ type: VerificationDto })
  verify(@Body() verificationDto: VerificationDto) {
    return this.authService.verify(verificationDto);
  }

  @Public()
  @Post('login')
  @ApiOperation({ summary: 'Login and get tokens' })
  @ApiBody({ type: LoginDto })
  login(@Body() loginDto: LoginDto) {
    return this.authService.login(loginDto);
  }

  @Public()
  @Post('refresh')
  @ApiOperation({ summary: 'Refresh access token' })
  @ApiBody({
    schema: {
      type: 'object',
      properties: {
        refreshToken: { type: 'string', example: 'your_refresh_token_here' },
      },
      required: ['refreshToken'],
    },
  })
  refresh(@Body('refreshToken') refreshToken: string) {
    if (!refreshToken) throw new UnauthorizedException('Refresh token missing');
    return this.authService.refresh(refreshToken);
  }

  @Public()
  @Post('forgot-password')
  @ApiOperation({ summary: 'Request password reset code' })
  @ApiBody({ type: ForgotPasswordDto })
  forgotPassword(@Body() forgotPasswordDto: ForgotPasswordDto) {
    return this.authService.forgotPassword(forgotPasswordDto);
  }

  @Public()
  @Post('reset-password')
  @ApiOperation({ summary: 'Reset password with code' })
  @ApiBody({ type: ResetPasswordDto })
  resetPassword(@Body() resetPasswordDto: ResetPasswordDto) {
    return this.authService.resetPassword(resetPasswordDto);
  }

  @Post('change-password')
  @ApiOperation({ summary: 'Change current user password' })
  @ApiResponse({ status: 200, description: 'The password has been successfully changed.' })
  @ApiBody({ type: ChangePasswordDto })
  async changePassword(
    @GetUser('userId') userId: string,
    @Body() changePasswordDto: ChangePasswordDto,
  ) {
    return this.authService.changePassword(userId, changePasswordDto);
  }

  // ── Google Login ─────────────────────────────────────────────────────────
  @Public()
  @Get('google/login')
  @UseGuards(AuthGuard('google-login'))
  @UseFilters(GoogleOAuthExceptionFilter)
  @ApiOperation({ summary: 'Initiate Google OAuth Login' })
  async googleLoginInit(@Req() req) { }

  @Public()
  @Get('google/login/callback')
  @UseGuards(AuthGuard('google-login'))
  @UseFilters(GoogleOAuthExceptionFilter)
  @ApiOperation({ summary: 'Handle Google OAuth Login callback' })
  async googleLoginCallback(@Req() req, @Res() res: Response) {
    try {
      const tokens = await this.authService.googleLogin(req);
      const frontendDomain = process.env.FRONTEND_DOMAIN || 'http://localhost:3000';
      const userStr = encodeURIComponent(JSON.stringify(tokens.user || {}));
      const subStr = tokens.subscription ? encodeURIComponent(JSON.stringify(tokens.subscription)) : '';
      return res.redirect(`${frontendDomain}/dashboard?accessToken=${tokens.accessToken}&refreshToken=${tokens.refreshToken}&user=${userStr}&subscription=${subStr}`);
    } catch (error) {
      const frontendDomain = process.env.FRONTEND_DOMAIN || 'http://localhost:3000';
      return res.redirect(`${frontendDomain}/login?error=${encodeURIComponent(error.message)}`);
    }
  }

  // ── Google Register ───────────────────────────────────────────────────────
  @Public()
  @Get('google/register')
  @UseGuards(AuthGuard('google-register'))
  @UseFilters(GoogleOAuthExceptionFilter)
  @ApiOperation({ summary: 'Initiate Google OAuth Register' })
  async googleRegisterInit(@Req() req) { }

  @Public()
  @Get('google/register/callback')
  @UseGuards(AuthGuard('google-register'))
  @UseFilters(GoogleOAuthExceptionFilter)
  @ApiOperation({ summary: 'Handle Google OAuth Register callback' })
  async googleRegisterCallback(@Req() req, @Res() res: Response) {
    try {
      const tokens = await this.authService.googleRegister(req);
      const frontendDomain = process.env.FRONTEND_DOMAIN || 'http://localhost:3000';
      const userStr = encodeURIComponent(JSON.stringify(tokens.user || {}));
      const subStr = tokens.subscription ? encodeURIComponent(JSON.stringify(tokens.subscription)) : '';
      return res.redirect(`${frontendDomain}/account-setup?accessToken=${tokens.accessToken}&refreshToken=${tokens.refreshToken}&user=${userStr}&subscription=${subStr}`);
    } catch (error) {
      console.error('GOOGLE REGISTER ERROR:', error);
      const frontendDomain = process.env.FRONTEND_DOMAIN || 'http://localhost:3000';
      return res.redirect(`${frontendDomain}/signup?error=${encodeURIComponent(error.message)}`);
    }
  }

  @Get('me')
  @ApiOperation({ summary: 'Get current user profile and latest subscription plan' })
  @ApiResponse({ status: 200, description: 'Return current user.' })
  async getMe(
    @GetUser('userId') userId: string,
    @GetUser('role') role: string,
  ) {
    return this.authService.getMe(userId, role);
  }
}
