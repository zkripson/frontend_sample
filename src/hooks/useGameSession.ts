import { useState, useEffect, useCallback, useRef } from 'react';
import { backendAPI, GameSession } from '../libs/api/backend-api';

// Game event types
export type GameEvent = 
  | { type: 'player_joined', address: string, players: string[], status: string }
  | { type: 'contract_registered', gameContractAddress: string, gameId: string }
  | { type: 'board_submitted', player: string, allBoardsSubmitted: boolean, gameStatus: string }
  | { type: 'game_started', status: string, currentTurn: string, gameContractAddress: string, gameId: string, turnStartedAt: number }
  | { type: 'shot_fired', player: string, x: number, y: number, nextTurn: string, turnStartedAt: number }
  | { type: 'shot_result', player: string, x: number, y: number, isHit: boolean }
  | { type: 'game_over', status: string, winner: string, reason: 'COMPLETED' | 'FORFEIT' | 'TIMEOUT' }
  | { type: 'session_state', sessionId: string, status: string, players: string[], currentTurn: string | null, gameId: string | null }
  | { type: 'chat', sender: string, text: string, timestamp: number }
  | { type: 'pong', timestamp: number }
  | { type: 'error', error: string };

// Hook return type
export interface GameSessionHook {
  // Session state
  sessionId: string | null;
  sessionState: GameSession | null;
  isConnected: boolean;
  events: GameEvent[];
  error: string | null;
  
  // Session actions
  connectToSession: (sessionId: string, playerAddress: string) => void;
  disconnectFromSession: () => void;
  createSession: (playerAddress: string) => Promise<string>;
  joinSession: (sessionId: string, playerAddress: string) => Promise<void>;
  submitBoard: (playerAddress: string, boardCommitment: string) => Promise<void>;
  sendChatMessage: (playerAddress: string, text: string) => void;
  registerGameContract: (gameId: number, gameContractAddress: string) => Promise<void>;
  
  // Utility methods
  clearEvents: () => void;
  clearError: () => void;
}

/**
 * Custom hook for managing game session via WebSockets
 */
export function useGameSession(): GameSessionHook {
  // Session state
  const [sessionId, setSessionId] = useState<string | null>(null);
  const [sessionState, setSessionState] = useState<GameSession | null>(null);
  const [isConnected, setIsConnected] = useState<boolean>(false);
  const [events, setEvents] = useState<GameEvent[]>([]);
  const [error, setError] = useState<string | null>(null);
  
  // WebSocket reference
  const webSocketRef = useRef<WebSocket | null>(null);
  
  // Heartbeat interval for keeping connection alive
  const heartbeatIntervalRef = useRef<NodeJS.Timeout | null>(null);
  
  // Connect to a game session
  const connectToSession = useCallback((sessionId: string, playerAddress: string) => {
    try {
      // Disconnect any existing connection
      if (webSocketRef.current) {
        webSocketRef.current.close();
      }
      
      // Clear existing heartbeat
      if (heartbeatIntervalRef.current) {
        clearInterval(heartbeatIntervalRef.current);
      }
      
      // Create WebSocket connection
      const wsUrl = backendAPI.getWebSocketURL(sessionId, playerAddress);
      const ws = new WebSocket(wsUrl);
      
      // Set event handlers
      ws.addEventListener('open', () => {
        console.log(`Connected to game session: ${sessionId}`);
        setIsConnected(true);
        setSessionId(sessionId);
        
        // Start heartbeat
        heartbeatIntervalRef.current = setInterval(() => {
          if (ws.readyState === WebSocket.OPEN) {
            ws.send(JSON.stringify({ type: 'ping' }));
          }
        }, 30000); // Send ping every 30 seconds
      });
      
      ws.addEventListener('message', (event) => {
        try {
          const data = JSON.parse(event.data);
          
          // Update session state if it's a state update
          if (data.type === 'session_state') {
            setSessionState({
              sessionId: data.sessionId,
              status: data.status,
              players: data.players,
              currentTurn: data.currentTurn,
              gameContractAddress: data.gameContractAddress,
              gameId: data.gameId,
              turnStartedAt: data.turnStartedAt,
              createdAt: data.createdAt || Date.now(),
              lastActivityAt: data.lastActivityAt || Date.now()
            });
          }
          
          // Add to events array
          setEvents(prev => [...prev, data]);
        } catch (err) {
          console.error('Error parsing WebSocket message:', err);
          setError('Failed to parse WebSocket message');
        }
      });
      
      ws.addEventListener('close', () => {
        console.log('WebSocket connection closed');
        setIsConnected(false);
        
        // Clear heartbeat
        if (heartbeatIntervalRef.current) {
          clearInterval(heartbeatIntervalRef.current);
        }
      });
      
      ws.addEventListener('error', (err) => {
        console.error('WebSocket error:', err);
        setError('WebSocket connection error');
      });
      
      // Store WebSocket reference
      webSocketRef.current = ws;
    } catch (err) {
      console.error('Error connecting to session:', err);
      setError('Failed to connect to game session');
    }
  }, []);
  
  // Disconnect from session
  const disconnectFromSession = useCallback(() => {
    if (webSocketRef.current) {
      webSocketRef.current.close();
      webSocketRef.current = null;
    }
    
    // Clear heartbeat
    if (heartbeatIntervalRef.current) {
      clearInterval(heartbeatIntervalRef.current);
      heartbeatIntervalRef.current = null;
    }
    
    setIsConnected(false);
    setSessionId(null);
    setSessionState(null);
  }, []);
  
  // Create a new session
  const createSession = useCallback(async (playerAddress: string) => {
    try {
      const session = await backendAPI.createSession(playerAddress);
      setSessionId(session.sessionId);
      setSessionState(session);
      
      // Connect to WebSocket for the new session
      connectToSession(session.sessionId, playerAddress);
      
      return session.sessionId;
    } catch (err) {
      console.error('Error creating session:', err);
      setError('Failed to create game session');
      throw err;
    }
  }, [connectToSession]);
  
  // Join an existing session
  const joinSession = useCallback(async (sessionId: string, playerAddress: string) => {
    try {
      await backendAPI.joinSession(sessionId, playerAddress);
      
      // Connect to WebSocket for the session
      connectToSession(sessionId, playerAddress);
    } catch (err) {
      console.error('Error joining session:', err);
      setError('Failed to join game session');
      throw err;
    }
  }, [connectToSession]);
  
  // Submit board commitment
  const submitBoard = useCallback(async (playerAddress: string, boardCommitment: string) => {
    if (!sessionId) {
      throw new Error('No active session');
    }
    
    try {
      await backendAPI.submitBoard(sessionId, playerAddress, boardCommitment);
    } catch (err) {
      console.error('Error submitting board:', err);
      setError('Failed to submit board');
      throw err;
    }
  }, [sessionId]);
  
  // Send chat message
  const sendChatMessage = useCallback((playerAddress: string, text: string) => {
    if (!webSocketRef.current || webSocketRef.current.readyState !== WebSocket.OPEN) {
      setError('WebSocket connection not open');
      return;
    }
    
    try {
      webSocketRef.current.send(JSON.stringify({
        type: 'chat',
        sender: playerAddress,
        text
      }));
    } catch (err) {
      console.error('Error sending chat message:', err);
      setError('Failed to send chat message');
    }
  }, []);
  
  // Register game contract with session
  const registerGameContract = useCallback(async (gameId: number, gameContractAddress: string) => {
    if (!sessionId) {
      throw new Error('No active session');
    }
    
    try {
      await backendAPI.registerGame(sessionId, gameId, gameContractAddress);
    } catch (err) {
      console.error('Error registering game contract:', err);
      setError('Failed to register game contract');
      throw err;
    }
  }, [sessionId]);
  
  // Clear events
  const clearEvents = useCallback(() => {
    setEvents([]);
  }, []);
  
  // Clear error
  const clearError = useCallback(() => {
    setError(null);
  }, []);
  
  // Clean up WebSocket on unmount
  useEffect(() => {
    return () => {
      // Close WebSocket
      if (webSocketRef.current) {
        webSocketRef.current.close();
      }
      
      // Clear heartbeat
      if (heartbeatIntervalRef.current) {
        clearInterval(heartbeatIntervalRef.current);
      }
    };
  }, []);
  
  return {
    // Session state
    sessionId,
    sessionState,
    isConnected,
    events,
    error,
    
    // Session actions
    connectToSession,
    disconnectFromSession,
    createSession,
    joinSession,
    submitBoard,
    sendChatMessage,
    registerGameContract,
    
    // Utility methods
    clearEvents,
    clearError
  };
}