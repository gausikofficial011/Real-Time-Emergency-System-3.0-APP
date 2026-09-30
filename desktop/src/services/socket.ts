import { io, Socket } from 'socket.io-client';

const SOCKET_URL = 'http://localhost:5000';

export const SOCKET_EVENTS = {
  AMBULANCE_ASSIGNED: 'ambulance_assigned',
  AMBULANCE_ASSIGNED_ADMIN: 'ambulance_assigned_admin',
  AMBULANCE_LOCATION: 'ambulance_location',
  AMBULANCE_STATUS_CHANGED: 'ambulance_status_changed',
  ASSIGNMENT_CONFIRMED: 'assignment_confirmed',
  NEW_EMERGENCY: 'new_emergency',
  STATUS_UPDATE: 'status_update',
  ROOM_JOINED: 'room_joined',
  PONG_SERVER: 'pong_server',
  DISPATCH_ASSIGNED: 'dispatch_assigned',
} as const;

class SocketService {
  private socket: Socket | null = null;
  private _isConnected = false;

  connect(): Socket {
    if (this.socket?.connected) return this.socket;

    this.socket = io(SOCKET_URL, {
      transports: ['websocket', 'polling'],
      reconnection: true,
      reconnectionAttempts: 10,
      reconnectionDelay: 1000,
      reconnectionDelayMax: 5000,
      timeout: 20000,
    });

    this.socket.on('connect', () => {
      this._isConnected = true;
      console.log('🔌 Socket connected:', this.socket?.id);
    });

    this.socket.on('disconnect', (reason) => {
      this._isConnected = false;
      console.log('🔌 Socket disconnected:', reason);
    });

    this.socket.on('reconnect', (attempt) => {
      console.log(`🔌 Socket reconnected after ${attempt} attempts`);
    });

    this.socket.on('connect_error', (err) => {
      console.error('Socket connection error:', err.message);
    });

    return this.socket;
  }

  disconnect() {
    this.socket?.disconnect();
    this.socket = null;
    this._isConnected = false;
  }

  joinAdminRoom(userId: string) {
    this.socket?.emit('join', { userId, role: 'admin' });
  }

  joinUserRoom(userId: string, role: string) {
    this.socket?.emit('join', { userId, role });
  }

  on(event: string, handler: (...args: any[]) => void) {
    this.socket?.on(event, handler);
  }

  off(event: string, handler: (...args: any[]) => void) {
    this.socket?.off(event, handler);
  }

  emit(event: string, data?: any) {
    this.socket?.emit(event, data);
  }

  ping() {
    this.socket?.emit('ping_server');
  }

  get isConnected() {
    return this.socket?.connected ?? false;
  }

  get socketId() {
    return this.socket?.id;
  }

  getSocket(): Socket | null {
    return this.socket;
  }
}

export const socketService = new SocketService();
export default socketService;
