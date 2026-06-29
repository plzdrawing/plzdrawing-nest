import { NestFactory } from '@nestjs/core';
import { AppModule } from './app.module';
import {
  ClassSerializerInterceptor,
  ValidationPipe,
  RequestMethod,
} from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { DocumentBuilder, SwaggerModule } from '@nestjs/swagger';
import { HttpExceptionFilter } from './common/filters/http-exception.filter';
import { Reflector } from '@nestjs/core';
import { parseCorsOrigins } from './common/cors/cors.config';
import { SocketIoCorsAdapter } from './common/adapters/socket-io-cors.adapter';

async function bootstrap() {
  const app = await NestFactory.create(AppModule);
  const configService = app.get(ConfigService);

  app.useGlobalFilters(new HttpExceptionFilter());
  app.useGlobalInterceptors(new ClassSerializerInterceptor(app.get(Reflector)));
  app.useGlobalPipes(
    new ValidationPipe({
      whitelist: true,
      forbidNonWhitelisted: true,
      transform: true,
    }),
  );

  app.setGlobalPrefix('api', {
    exclude: [{ path: 'chat-test', method: RequestMethod.GET }],
  });

  const corsOrigins = parseCorsOrigins(
    configService.get<string>('CORS_ORIGINS'),
  );
  const websocketCorsOrigins = parseCorsOrigins(
    configService.get<string>('CHAT_WS_CORS_ORIGINS'),
    corsOrigins,
  );

  app.enableCors({
    origin: corsOrigins,
    credentials: true,
    methods: 'GET,HEAD,PUT,PATCH,POST,DELETE,OPTIONS',
  });
  app.useWebSocketAdapter(
    new SocketIoCorsAdapter(app, {
      origin: websocketCorsOrigins,
      credentials: true,
    }),
  );

  const swaggerEnabled =
    configService.get<string>('SWAGGER_ENABLED') !== 'false';
  if (swaggerEnabled) {
    const swaggerConfig = new DocumentBuilder()
      .setTitle('PlzDrawing API')
      .setDescription('PlzDrawing API 문서')
      .setVersion('1.0')
      .addBearerAuth(
        {
          type: 'http',
          scheme: 'bearer',
          bearerFormat: 'JWT',
          name: 'JWT',
          description: 'Enter JWT token',
          in: 'header',
        },
        'access-token',
      )
      .build();

    const document = SwaggerModule.createDocument(app, swaggerConfig);

    SwaggerModule.setup('api-docs', app, document, {
      useGlobalPrefix: false,
      jsonDocumentUrl: 'api-docs-json',
    });
  }

  const port = configService.get<number>('PORT') || 3000;
  await app.listen(port);
  console.log(`Application is running on: ${await app.getUrl()}`);
}

void bootstrap();
