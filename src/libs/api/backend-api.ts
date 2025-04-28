/* eslint-disable @typescript-eslint/no-explicit-any */
import { BACKEND_CONFIG } from '../contracts/config';

// API types
export interface Invitation {
  id: string;
  code: string;
  creator: string;
  createdAt: number;
  expiresAt: number;
  sessionId: string | null;
  status: 'pending' | 'accepted' | 'expired' | 'canceled';
  acceptedBy: string | null;
  acceptedAt: number | null;
}

export interface GameSession {
  sessionId: string;
  status: 'CREATED' | 'WAITING' | 'ACTIVE' | 'COMPLETED' | 'CANCELLED' | 'SETUP';
  players: string[];
  currentTurn: string | null;
  gameContractAddress: string | null;
  gameId: string | null;
  turnStartedAt: number | null;
  createdAt: number;
  lastActivityAt: number;
}

// Backend API client
class BackendAPI {
  private baseUrl: string;
  
  constructor() {
    this.baseUrl = BACKEND_CONFIG.apiUrl;
  }

  // Invite management
  async createInvite(creatorAddress: string): Promise<Invitation> {
    const response = await fetch(`${this.baseUrl}/api/invites/create`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ creator: creatorAddress }),
    });
    
    if (!response.ok) {
      const error = await response.json();
      throw new Error(`Failed to create invite: ${error.error}`);
    }
    
    return response.json();
  }
  
  async acceptInvite(code: string, playerAddress: string): Promise<{ inviteId: string; sessionId: string }> {
    const response = await fetch(`${this.baseUrl}/api/invites/accept`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ code, player: playerAddress }),
    });
    
    if (!response.ok) {
      const error = await response.json();
      throw new Error(`Failed to accept invite: ${error.error}`);
    }
    
    return response.json();
  }
  
  async getInviteByCode(code: string): Promise<Invitation> {
    const response = await fetch(`${this.baseUrl}/api/invites/code/${code}`);
    
    if (!response.ok) {
      const error = await response.json();
      throw new Error(`Failed to get invite: ${error.error}`);
    }
    
    return response.json();
  }
  
  // Session management
  async createSession(creatorAddress: string): Promise<GameSession> {
    const response = await fetch(`${this.baseUrl}/api/sessions/create`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ creator: creatorAddress }),
    });
    
    if (!response.ok) {
      const error = await response.json();
      throw new Error(`Failed to create session: ${error.error}`);
    }
    
    return response.json();
  }
  
  async getSession(sessionId: string): Promise<GameSession> {
    const response = await fetch(`${this.baseUrl}/api/sessions/${sessionId}`);
    
    if (!response.ok) {
      const error = await response.json();
      throw new Error(`Failed to get session: ${error.error}`);
    }
    
    return response.json();
  }
  
  async joinSession(sessionId: string, playerAddress: string): Promise<GameSession> {
    const response = await fetch(`${this.baseUrl}/api/sessions/${sessionId}/join`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ address: playerAddress }),
    });
    
    if (!response.ok) {
      const error = await response.json();
      throw new Error(`Failed to join session: ${error.error}`);
    }
    
    return response.json();
  }
  
  async submitBoard(sessionId: string, playerAddress: string, boardCommitment: string): Promise<any> {
    const response = await fetch(`${this.baseUrl}/api/sessions/${sessionId}/submit-board`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ 
        address: playerAddress,
        boardCommitment
      }),
    });
    
    if (!response.ok) {
      const error = await response.json();
      throw new Error(`Failed to submit board: ${error.error}`);
    }
    
    return response.json();
  }
  
  // Contract integration
  async registerGame(sessionId: string, gameId: number, gameContractAddress: string): Promise<any> {
    const response = await fetch(`${this.baseUrl}/api/contracts/register-game`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ 
        sessionId,
        gameId,
        gameContractAddress
      }),
    });
    
    if (!response.ok) {
      const error = await response.json();
      throw new Error(`Failed to register game contract: ${error.error}`);
    }
    
    return response.json();
  }
  
  async syncSession(sessionId: string, event: any): Promise<any> {
    const response = await fetch(`${this.baseUrl}/api/contracts/sync-session`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ 
        sessionId,
        event
      }),
    });
    
    if (!response.ok) {
      const error = await response.json();
      throw new Error(`Failed to sync session: ${error.error}`);
    }
    
    return response.json();
  }
  
  async getContractConfig(): Promise<any> {
    const response = await fetch(`${this.baseUrl}/api/contracts/config`);
    
    if (!response.ok) {
      const error = await response.json();
      throw new Error(`Failed to get contract config: ${error.error}`);
    }
    
    return response.json();
  }
  
  // WebSocket URL
  getWebSocketURL(sessionId: string, playerAddress: string): string {
    return `${BACKEND_CONFIG.wsUrl}?sessionId=${sessionId}&address=${playerAddress}`;
  }
}

// Export singleton instance
export const backendAPI = new BackendAPI();