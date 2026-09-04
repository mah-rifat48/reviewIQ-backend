import { NestFactory } from '@nestjs/core';
import { AppModule } from './src/app.module';
import { AuthService } from './src/modules/auth/auth.service';

async function bootstrap() {
  const app = await NestFactory.createApplicationContext(AppModule);
  const authService = app.get(AuthService);
  
  try {
    await authService.googleRegister({
      user: {
        googleId: 'test-google-id',
        email: 'test' + Date.now() + '@google.com',
        firstName: 'Test',
        lastName: 'User'
      }
    });
    console.log('Success!');
  } catch (error) {
    console.error('FULL ERROR:');
    console.error(error);
  }
  await app.close();
}
bootstrap();
