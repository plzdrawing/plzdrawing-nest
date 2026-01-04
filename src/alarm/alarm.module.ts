import { Module } from '@nestjs/common';
import { AlarmService } from './alarm.service';
import { AlarmController } from './alarm.controller';
import { FirebaseModule } from '../common/firebase/firebase.module';

@Module({
  imports: [FirebaseModule],
  providers: [AlarmService],
  controllers: [AlarmController],
  exports: [AlarmService],
})
export class AlarmModule {}
