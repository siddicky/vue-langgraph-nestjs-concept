import { Module, Global } from '@nestjs/common';
import { ThreadService } from './thread.service';

@Global()
@Module({
  providers: [ThreadService],
  exports: [ThreadService],
})
export class ThreadModule {}
