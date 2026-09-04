import {
  WebSocketGateway,
  WebSocketServer,
  OnGatewayConnection,
  OnGatewayDisconnect,
} from '@nestjs/websockets';
import { Server, Socket } from 'socket.io';
import { JwtService } from '@nestjs/jwt';
import { ConfigService } from '@nestjs/config';
import { Injectable } from '@nestjs/common';

@WebSocketGateway({
  cors: {
    origin: '*',
    credentials: true,
  },
})
@Injectable()
export class NotificationGateway implements OnGatewayConnection, OnGatewayDisconnect {
  @WebSocketServer()
  server: Server;

  private userSocketMap = new Map<string, string>();

  constructor(
    private readonly jwtService: JwtService,
    private readonly configService: ConfigService,
  ) { }

  async handleConnection(client: Socket) {
    let token = client.handshake.auth?.token || client.handshake.headers?.authorization;
    if (token && token.startsWith('Bearer ')) {
      token = token.split(' ')[1];
    }

    if (!token) {
      client.disconnect();
      return;
    }

    try {
      const payload = await this.jwtService.verifyAsync(token, {
        secret: this.configService.get('jwt.secret'),
      });

      const userId = payload.sub;
      const role = payload.role;
      this.userSocketMap.set(userId, client.id);
      (client as any).userId = userId;


      if (role === 'ADMIN' || role === 'SUPER_ADMIN') {
        client.join('admins');
        console.log(`🛡️ Admin joined room: ${userId}`);
      }

      console.log(`🟢 User connected: ${userId} (Socket: ${client.id})`);
    } catch (error) {
      console.error('Socket Auth Error:', error.message);
      client.disconnect();
    }
  }

  handleDisconnect(client: Socket) {
    const userId = (client as any).userId;
    if (userId) {
      this.userSocketMap.delete(userId);
      console.log(`🔴 User disconnected: ${userId}`);
    }
  }

  sendNotification(userId: string, event: string, data: any) {
    const socketId = this.userSocketMap.get(userId);
    if (socketId) {
      this.server.to(socketId).emit(event, data);
    }
  }


  broadcastToAdmins(event: string, data: any) {
    this.server.to('admins').emit(event, data);
  }
}
