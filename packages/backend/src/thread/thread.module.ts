import { Module } from '@nestjs/common'
import { ThreadService } from './thread.service'

@Module({
  providers: [ThreadService],
  exports: [ThreadService],
})
export class ThreadModule {}
