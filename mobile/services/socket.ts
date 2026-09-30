import { io, Socket } from 'socket.io-client';
import { Platform } from 'react-native';
import Constants from 'expo-constants';

const getSocketUrl = () => {
  if (__DEV__) {
    const hostUri = Constants.expoConfig?.hostUri;
    if (hostUri) {
      const ip = hostUri.split(':')[0];
      if (ip && !ip.includes('ngrok') && !ip.includes('expo')) {
        return `http://${ip}:5000`;
      }
    }
    if (Platform.OS === 'android') {
      return 'http://10.0.2.2:5000';
    }
  }
  return 'http://10.20.20.85:5000';
};

class SocketService {
  private socket: Socket | null = null;

  connect(): Socket {
    if (this.socket?.connected) return this.socket;

    this.socket = io(getSocketUrl(), {
      transports: ['websocket'],
      reconnection: true,
      reconnectionAttempts: 10,
      reconnectionDelay: 1000,
    });

    this.socket.on('connect', () => {
      console.log('🔌 Mobile socket connected:', this.socket?.id);
    });

    this.socket.on('disconnect', (reason) => {
      console.log('🔌 Mobile socket disconnected:', reason);
    });

    return this.socket;
  }

  disconnect() {
    this.socket?.disconnect();
    this.socket = null;
  }

  joinRoom(userId: string, role: string) {
    this.socket?.emit('join', { userId, role });
  }

  updateDriverLocation(driverId: string, lat: number, lng: number) {
    this.socket?.emit('driver_location_update', { driverId, lat, lng });
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

  get isConnected() {
    return this.socket?.connected ?? false;
  }
}

export const socketService = new SocketService();
export default socketService;
