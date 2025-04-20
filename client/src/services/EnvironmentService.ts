import mitt from 'mitt';
import { EnvironmentState, AmbientEffect } from '../../server/src/services/EnvironmentService/types';
import { io } from 'socket.io-client';

export class EnvironmentService {
  private static instance: EnvironmentService | null = null;
  private emitter = mitt();
  private state: EnvironmentState | null = null;
  private socket: ReturnType<typeof io> | null = null;
  private reconnectAttempts = 0;
  private maxReconnectAttempts = 5;

  private constructor() {
    this.connect();
  }

  public static getInstance(): EnvironmentService {
    if (!EnvironmentService.instance) {
      EnvironmentService.instance = new EnvironmentService();
    }
    return EnvironmentService.instance;
  }

  // Add event emitter methods
  on(event: string, handler: (data?: any) => void) {
    this.emitter.on(event, handler);
  }

  off(event: string, handler: (data?: any) => void) {
    this.emitter.off(event, handler);
  }

  emit(event: string, data?: any) {
    this.emitter.emit(event, data);
  }

  private connect(): void {
    if (this.socket) {
      this.socket.disconnect();
    }

    this.socket = io(`http://${window.location.hostname}:3001/environment`, {
      reconnection: true,
      reconnectionAttempts: this.maxReconnectAttempts,
      reconnectionDelay: 1000,
      reconnectionDelayMax: 5000,
      timeout: 20000,
      transports: ['websocket', 'polling'],
      path: '/socket.io/',
      withCredentials: true,
      forceNew: true
    });

    this.socket.on('connect', () => {
      console.log('Connected to environment service');
      this.reconnectAttempts = 0;
    });

    this.socket.on('state', (data) => {
      this.state = data.state;
      this.emit('stateUpdate', this.state);
    });

    this.socket.on('transitionProgress', (data) => {
      this.emit('transitionProgress', data.progress);
    });

    this.socket.on('transitionComplete', (data) => {
      this.state = data.state;
      this.emit('transitionComplete', this.state);
    });

    this.socket.on('ambientUpdate', (data) => {
      this.emit('ambientUpdate', data.effects);
    });

    this.socket.on('disconnect', () => {
      console.log('Disconnected from environment service');
      this.handleDisconnect();
    });

    this.socket.on('error', (error) => {
      console.error('WebSocket error:', error);
    });
  }

  private handleDisconnect(): void {
    if (this.reconnectAttempts < this.maxReconnectAttempts) {
      this.reconnectAttempts++;
      const delay = Math.min(1000 * Math.pow(2, this.reconnectAttempts), 30000);
      setTimeout(() => this.connect(), delay);
    }
  }

  public async updateEnvironment(mood: string, intensity: number): Promise<void> {
    if (!this.socket || !this.socket.connected) {
      throw new Error('Not connected to environment service');
    }

    this.socket.emit('updateEnvironment', {
      mood,
      intensity
    });
  }

  public getCurrentState(): EnvironmentState | null {
    return this.state;
  }

  public dispose(): void {
    if (this.socket) {
      this.socket.disconnect();
    }
    this.emitter.all.clear();
  }
} 