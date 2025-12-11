import { io, Socket } from 'socket.io-client';
import { RetroSession } from '../types';

type SessionUpdateCallback = (session: RetroSession) => void;
type MemberEventCallback = (data: { userId: string; userName: string }) => void;

class SyncService {
  private socket: Socket | null = null;
  private sessionUpdateCallbacks: SessionUpdateCallback[] = [];
  private memberJoinedCallbacks: MemberEventCallback[] = [];
  private memberLeftCallbacks: MemberEventCallback[] = [];
  private currentSessionId: string | null = null;

  connect() {
    if (this.socket?.connected) return;

    // Connect to the same host
    const url = window.location.origin;
    this.socket = io(url, {
      transports: ['websocket', 'polling']
    });

    this.socket.on('connect', () => {
      console.log('Connected to sync server');
      // Rejoin session if we were in one
      if (this.currentSessionId) {
        const savedUserId = localStorage.getItem('retro_active_user');
        const savedUserName = localStorage.getItem('retro_active_user_name');
        if (savedUserId && savedUserName) {
          this.joinSession(this.currentSessionId, savedUserId, savedUserName);
        }
      }
    });

    this.socket.on('session-update', (session: RetroSession) => {
      this.sessionUpdateCallbacks.forEach(cb => cb(session));
    });

    this.socket.on('member-joined', (data: { userId: string; userName: string }) => {
      this.memberJoinedCallbacks.forEach(cb => cb(data));
    });

    this.socket.on('member-left', (data: { userId: string; userName: string }) => {
      this.memberLeftCallbacks.forEach(cb => cb(data));
    });

    this.socket.on('disconnect', () => {
      console.log('Disconnected from sync server');
    });
  }

  disconnect() {
    if (this.socket) {
      this.socket.disconnect();
      this.socket = null;
    }
  }

  joinSession(sessionId: string, userId: string, userName: string) {
    this.currentSessionId = sessionId;
    localStorage.setItem('retro_active_user_name', userName);

    if (this.socket?.connected) {
      this.socket.emit('join-session', { sessionId, userId, userName });
    }
  }

  leaveSession() {
    this.currentSessionId = null;
  }

  updateSession(session: RetroSession) {
    if (this.socket?.connected) {
      this.socket.emit('update-session', session);
    }
  }

  onSessionUpdate(callback: SessionUpdateCallback) {
    this.sessionUpdateCallbacks.push(callback);
    return () => {
      this.sessionUpdateCallbacks = this.sessionUpdateCallbacks.filter(cb => cb !== callback);
    };
  }

  onMemberJoined(callback: MemberEventCallback) {
    this.memberJoinedCallbacks.push(callback);
    return () => {
      this.memberJoinedCallbacks = this.memberJoinedCallbacks.filter(cb => cb !== callback);
    };
  }

  onMemberLeft(callback: MemberEventCallback) {
    this.memberLeftCallbacks.push(callback);
    return () => {
      this.memberLeftCallbacks = this.memberLeftCallbacks.filter(cb => cb !== callback);
    };
  }

  isConnected() {
    return this.socket?.connected || false;
  }
}

export const syncService = new SyncService();
