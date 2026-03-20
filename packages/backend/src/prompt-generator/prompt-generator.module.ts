import { Module } from '@nestjs/common';
import { PromptGeneratorController } from './prompt-generator.controller';
import { PromptGeneratorService } from './prompt-generator.service';

@Module({
  controllers: [PromptGeneratorController],
  providers: [PromptGeneratorService],
})
export class PromptGeneratorModule {}
