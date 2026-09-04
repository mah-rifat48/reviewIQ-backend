import { ExceptionFilter, Catch, ArgumentsHost, HttpException } from '@nestjs/common';
import { Response, Request } from 'express';

@Catch(Error)
export class GoogleOAuthExceptionFilter implements ExceptionFilter {
  catch(exception: Error, host: ArgumentsHost) {
    const ctx = host.switchToHttp();
    const response = ctx.getResponse<Response>();
    const request = ctx.getRequest<Request>();

    const frontendDomain = process.env.FRONTEND_DOMAIN || 'http://localhost:3000';
    let message = exception.message || 'Authentication failed';
    
    // If it's an HttpException, we can try to get a more specific message
    if (exception instanceof HttpException) {
      const resp = exception.getResponse() as any;
      message = resp?.message || message;
      if (Array.isArray(message)) {
        message = message[0];
      }
    }

    // Determine if the request was for registration or login
    const isRegister = request.url.includes('register');
    const redirectPath = isRegister ? '/signup' : '/login';

    response.redirect(`${frontendDomain}${redirectPath}?error=${encodeURIComponent(message)}`);
  }
}
