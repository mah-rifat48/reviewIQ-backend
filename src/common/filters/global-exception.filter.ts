/* eslint-disable @typescript-eslint/no-unsafe-argument */
/* eslint-disable @typescript-eslint/no-unsafe-member-access */
/* eslint-disable @typescript-eslint/no-unsafe-assignment */
import {
  ExceptionFilter,
  Catch,
  ArgumentsHost,
  HttpException,
  HttpStatus,
  Logger,
  BadRequestException,
} from '@nestjs/common';
import { Request, Response } from 'express';

interface ErrorResponse {
  success: boolean;
  statusCode: number;
  message: string;
  errors: string[];
  errorCode?: string;
  path: string;
  method: string;
  timestamp: string;
  stack?: string;
}

@Catch()
export class GlobalExceptionFilter implements ExceptionFilter {
  private readonly logger = new Logger(GlobalExceptionFilter.name);

  catch(exception: unknown, host: ArgumentsHost): void {
    const ctx = host.switchToHttp();
    const response = ctx.getResponse<Response>();
    const request = ctx.getRequest<Request>();

    if (!exception) {
      this.logger.error('Caught undefined exception!');
      this.sendErrorResponse(response, {
        success: false,
        statusCode: HttpStatus.INTERNAL_SERVER_ERROR,
        message: 'Unknown error occurred',
        errors: ['Unknown error occurred'],
        errorCode: 'UnknownError',
        path: request?.url || 'unknown',
        method: request?.method || 'unknown',
        timestamp: new Date().toISOString(),
      });
      return;
    }

    const { errorResponse, internalDetails } = this.buildErrorResponse(exception, request);
    this.sendErrorResponse(response, errorResponse);
    this.logError(request, errorResponse, internalDetails, exception);
  }

  private buildErrorResponse(
    exception: unknown,
    request: Request,
  ): { errorResponse: ErrorResponse; internalDetails: any } {
    const baseResponse: ErrorResponse = {
      success: false,
      statusCode: HttpStatus.INTERNAL_SERVER_ERROR,
      message: 'Internal server error',
      errors: ['Internal server error'],
      errorCode: 'InternalServerError',
      path: request?.url || 'unknown',
      method: request?.method || 'unknown',
      timestamp: new Date().toISOString(),
    };

    if (exception instanceof HttpException) {
      return this.handleHttpException(exception, baseResponse);
    }
    if (this.isPrismaError(exception)) {
      return this.handlePrismaError(exception, baseResponse);
    }
    if (exception instanceof Error) {
      return this.handleGenericError(exception, baseResponse);
    }

    return {
      errorResponse: {
        ...baseResponse,
        message: 'An unexpected error occurred',
        errors: ['An unexpected error occurred'],
        errorCode: 'UnexpectedError',
      },
      internalDetails: exception,
    };
  }

  private handleHttpException(
    exception: HttpException,
    baseResponse: ErrorResponse,
  ): { errorResponse: ErrorResponse; internalDetails: any } {
    const status = exception.getStatus();
    const exceptionResponse = exception.getResponse();

    let message = 'HTTP exception occurred';
    let errors: string[] = [];
    let internalDetails: any = null;

    if (exception instanceof BadRequestException) {
      const parsed = this.handleBadRequestException(exceptionResponse);
      message = parsed.message;
      errors = parsed.errors;
      internalDetails = parsed.internalDetails;
    } else if (typeof exceptionResponse === 'string') {
      message = exceptionResponse;
      errors = [exceptionResponse];
    } else if (
      typeof exceptionResponse === 'object' &&
      exceptionResponse !== null
    ) {
      const responseObj = exceptionResponse as any;
      message = responseObj.message || 'HTTP exception occurred';
      
      if (Array.isArray(responseObj.message)) {
        errors = responseObj.message;
        message = responseObj.message[0] || message;
      } else if (typeof responseObj.message === 'string') {
        errors = [responseObj.message];
      } else {
        errors = [message];
      }
      
      // Extract details for logging only, don't send to frontend
      // eslint-disable-next-line @typescript-eslint/no-unused-vars
      const { message: _, statusCode: __, error: ___, ...details } = responseObj;
      if (Object.keys(details).length > 0) {
        internalDetails = details;
      }
    }

    return {
      errorResponse: {
        ...baseResponse,
        statusCode: status,
        message,
        errors,
        errorCode: exception.constructor.name,
      },
      internalDetails,
    };
  }

  private handleBadRequestException(
    exceptionResponse: string | Record<string, any>,
  ): {
    message: string;
    errors: string[];
    internalDetails?: Record<string, unknown>;
  } {
    if (typeof exceptionResponse === 'string') {
      return { message: exceptionResponse, errors: [exceptionResponse] };
    }

    const response = exceptionResponse as {
      message?: string | string[];
      error?: string;
    };
    
    let message: string;
    let errors: string[];

    if (Array.isArray(response.message)) {
      message = response.message[0] || 'Validation failed';
      errors = response.message;
    } else if (typeof response.message === 'string') {
      message = response.message;
      errors = [response.message];
    } else {
      message = response.error || 'Bad request';
      errors = [message];
    }

    return { message, errors, internalDetails: response as Record<string, unknown> };
  }

  private handlePrismaError(
    exception: any,
    baseResponse: ErrorResponse,
  ): { errorResponse: ErrorResponse; internalDetails: any } {
    const errorName = exception.constructor?.name || '';
    let errorResponse: ErrorResponse = { ...baseResponse };

    if (errorName === 'PrismaClientValidationError') {
      errorResponse = {
        ...baseResponse,
        statusCode: HttpStatus.BAD_REQUEST,
        message: 'Database validation error',
        errors: ['Invalid data provided to the database operation'],
        errorCode: 'PrismaValidationError',
      };
    } else if (errorName === 'PrismaClientKnownRequestError') {
      errorResponse = this.handlePrismaKnownError(exception, baseResponse);
    } else if (errorName === 'PrismaClientUnknownRequestError') {
      errorResponse = {
        ...baseResponse,
        statusCode: HttpStatus.INTERNAL_SERVER_ERROR,
        message: 'Database error',
        errors: ['An unknown database operation failed'],
        errorCode: 'PrismaUnknownError',
      };
    } else if (errorName === 'PrismaClientRustPanicError') {
      errorResponse = {
        ...baseResponse,
        statusCode: HttpStatus.INTERNAL_SERVER_ERROR,
        message: 'Database engine error',
        errors: ['A critical database system error occurred'],
        errorCode: 'PrismaRustPanicError',
      };
    } else if (errorName === 'PrismaClientInitializationError') {
      errorResponse = {
        ...baseResponse,
        statusCode: HttpStatus.SERVICE_UNAVAILABLE,
        message: 'Database connection error',
        errors: ['Failed to connect to the database system'],
        errorCode: 'PrismaInitializationError',
      };
    } else {
      errorResponse = {
        ...baseResponse,
        message: 'Database operation failed',
        errors: ['A general database error occurred'],
        errorCode: 'PrismaClientError',
      };
    }

    return {
      errorResponse,
      internalDetails: {
        code: exception.code,
        meta: exception.meta,
        message: exception.message,
      },
    };
  }

  private handlePrismaKnownError(
    exception: any,
    baseResponse: ErrorResponse,
  ): ErrorResponse {
    const errorMap: Record<string, { status: number; message: string }> = {
      P2002: {
        status: HttpStatus.CONFLICT,
        message: 'A record with this data already exists',
      },
      P2014: {
        status: HttpStatus.BAD_REQUEST,
        message: 'Invalid relation data',
      },
      P2003: {
        status: HttpStatus.BAD_REQUEST,
        message: 'Foreign key constraint failed',
      },
      P2025: { status: HttpStatus.NOT_FOUND, message: 'Record not found' },
      P2016: {
        status: HttpStatus.BAD_REQUEST,
        message: 'Query interpretation error',
      },
      P2021: { status: HttpStatus.NOT_FOUND, message: 'Table does not exist' },
      P2022: { status: HttpStatus.NOT_FOUND, message: 'Column does not exist' },
    };

    const errorInfo = errorMap[exception.code] || {
      status: HttpStatus.BAD_REQUEST,
      message: 'Database constraint error',
    };

    if (exception.code === 'P2002' && exception.meta?.target) {
       const target = Array.isArray(exception.meta.target) ? exception.meta.target.join(', ') : exception.meta.target;
       errorInfo.message = `The ${target} is already taken`;
    }

    return {
      ...baseResponse,
      statusCode: errorInfo.status,
      message: errorInfo.message,
      errors: [errorInfo.message],
      errorCode: 'DatabaseConflict',
    };
  }

  private handleGenericError(
    exception: Error,
    baseResponse: ErrorResponse,
  ): { errorResponse: ErrorResponse; internalDetails: any } {
    return {
      errorResponse: {
        ...baseResponse,
        message: exception.message || 'An error occurred',
        errors: [exception.message || 'An error occurred'],
        errorCode: exception.constructor.name,
        ...(process.env.NODE_ENV === 'development' && { stack: exception.stack }),
      },
      internalDetails: { stack: exception.stack },
    };
  }

  private isPrismaError(exception: unknown): boolean {
    if (!exception || typeof exception !== 'object') {
      return false;
    }

    const errorName = (exception as any).constructor?.name || '';
    const prismaErrorNames = [
      'PrismaClientValidationError',
      'PrismaClientKnownRequestError',
      'PrismaClientUnknownRequestError',
      'PrismaClientRustPanicError',
      'PrismaClientInitializationError',
    ];

    return prismaErrorNames.includes(errorName);
  }

  private sendErrorResponse(
    response: Response,
    errorResponse: ErrorResponse,
  ): void {
    response.status(errorResponse.statusCode).json(errorResponse);
  }

  private logError(
    request: Request,
    errorResponse: ErrorResponse,
    internalDetails: any,
    exception: unknown,
  ): void {
    const logMessage = `${request.method} ${request.url} - ${errorResponse.statusCode} ${errorResponse.message}`;

    const logDetails = {
      url: request.url,
      method: request.method,
      statusCode: errorResponse.statusCode,
      message: errorResponse.message,
      errors: errorResponse.errors,
      errorCode: errorResponse.errorCode,
      userAgent: request.get('user-agent'),
      ip: request.ip,
      ...(internalDetails && { internalDetails }),
    };

    if (errorResponse.statusCode >= 500) {
      this.logger.error(
        logMessage,
        exception instanceof Error ? exception.stack : undefined,
      );
      this.logger.error(JSON.stringify(logDetails, null, 2));
    } else if (errorResponse.statusCode >= 400) {
      this.logger.warn(logMessage, JSON.stringify(logDetails, null, 2));
    } else {
      this.logger.log(logMessage, JSON.stringify(logDetails, null, 2));
    }
  }
}
