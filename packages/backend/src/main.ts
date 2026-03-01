import { NestFactory } from '@nestjs/core';
import { AppModule } from './app.module';

async function bootstrap() {
  const app = await NestFactory.create(AppModule);
  const corsOriginsEnv = process.env.CORS_ORIGINS;
  const allowedOrigins = corsOriginsEnv
    ? corsOriginsEnv.split(',').map((origin) => origin.trim()).filter(Boolean)
    : ['http://localhost:5173'];
  // Treat a single '*' specially to enable wildcard CORS instead of a literal origin match.
  const corsOriginOption =
    allowedOrigins.length === 1 && allowedOrigins[0] === '*'
      ? true
      : allowedOrigins;
  app.enableCors({ origin: corsOriginOption });
  const port = process.env.PORT || 3000;
  await app.listen(port);
  console.log(`Backend running on http://localhost:${port}`);
}
bootstrap();
