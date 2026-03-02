import { Module } from '@nestjs/common';
import { CronsController } from './crons.controller';
import { CronsService } from './crons.service';

@Module({
  controllers: [CronsController],
  providers: [CronsService],
  exports: [CronsService],
})
export class CronsModule {}
