import type { INestApplicationContext } from '@nestjs/common';
import { IoAdapter } from '@nestjs/platform-socket.io';
import type { ServerOptions } from 'socket.io';

export class SocketIoCorsAdapter extends IoAdapter {
  constructor(
    appOrHttpServer: INestApplicationContext,
    private readonly corsOptions: NonNullable<ServerOptions['cors']>,
  ) {
    super(appOrHttpServer);
  }

  createIOServer(port: number, options?: ServerOptions): unknown {
    return super.createIOServer(port, {
      ...options,
      cors: {
        ...options?.cors,
        ...this.corsOptions,
      },
    });
  }
}
