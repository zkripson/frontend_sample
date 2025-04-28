'use client';

import React, { useState, useEffect, useCallback } from 'react';
import { useParams, useRouter } from 'next/navigation';

// Components
import GameBoard from '../../../components/game/Board';
import ShipPlacement from '../../../components/game/ShipPlacement';

// Hooks
import { useContracts } from '../../../hooks/useContracts';
import { useGameSession } from '../../../hooks/useGameSession';

// ZK Prover and Types
import { Board, generateBoardCommitment, generateBoardProof, generateSalt } from '../../../libs/zk/boardProver';
import { ShotMap, createEmptyShotMap, addShot, generateShotProof, checkShotResult, generateGameEndProof, checkAllShipsSunk } from '../../../libs/zk/shotProver';

// Game states
enum GamePhase {
  CONNECTING,
  WAITING_FOR_OPPONENT,
  PLACING_SHIPS,
  WAITING_FOR_OPPONENT_BOARD,
  PLAYING,
  GAME_OVER
}

// Extended GameSession interface to include missing properties
interface ExtendedGameSession {
  sessionId: string;
  status: string;
  players: string[];
  currentTurn: string | null;
  gameContractAddress?: string;
  gameId?: string | null;
  turnStartedAt?: number;
  createdAt?: number;
  lastActivityAt?: number;
  winner?: string; // Added missing winner property
}

// Game page component
export default function GamePage() {
  // Get game ID from URL
  const { id } = useParams<{ id: string }>();
  const router = useRouter();
  
  // Contract hooks
  const {
    address: account,
    isConnected,
    connectWallet,
    submitBoard: contractSubmitBoard,
    makeShot: contractMakeShot,
    submitShotResult: contractSubmitShotResult,
    verifyGameEnd: contractVerifyGameEnd,
    forfeit: contractForfeit
  } = useContracts();
  
  // Game session hooks
  const {
    sessionState,
    events,
    connectToSession,
    submitBoard: sessionSubmitBoard
  } = useGameSession();
  
  // Game state
  const [gamePhase, setGamePhase] = useState<GamePhase>(GamePhase.CONNECTING);
  const [gameAddress, setGameAddress] = useState<string | null>(null);
  const [opponent, setOpponent] = useState<string | null>(null);
  const [isPlayerTurn, setIsPlayerTurn] = useState<boolean>(false);
  const [winner, setWinner] = useState<string | null>(null);
  
  // Board state
  const [playerBoard, setPlayerBoard] = useState<Board | null>(null);
  const [playerBoardCommitment, setPlayerBoardCommitment] = useState<string | null>(null);
  const [playerBoardSalt, setPlayerBoardSalt] = useState<string | null>(null);
  
  // Shot tracking
  const [shotsAtPlayer, setShotsAtPlayer] = useState<ShotMap>(createEmptyShotMap());
  const [shotsAtOpponent, setShotsAtOpponent] = useState<ShotMap>(createEmptyShotMap());
  
  // Loading states
  const [isSubmittingBoard, setIsSubmittingBoard] = useState<boolean>(false);
  const [isMakingShot, setIsMakingShot] = useState<boolean>(false);
  const [isProcessingShot, setIsProcessingShot] = useState<boolean>(false);
  
  // Status messages
  const [statusMessage, setStatusMessage] = useState<string>('Connecting to game...');
  
  // Connect wallet and initialize game
  useEffect(() => {
    if (!isConnected) {
      connectWallet();
    }
    
    if (isConnected && account && id) {
      // Connect to game session
      connectToSession(id, account);
    }
  }, [isConnected, connectWallet, account, id, connectToSession]);
  
  // Process session state changes
  useEffect(() => {
    if (!sessionState) return;
    
    // Cast sessionState to our extended interface that includes winner
    const extendedState = sessionState as ExtendedGameSession;
    
    // Update game state based on session state
    if (extendedState.gameContractAddress) {
      setGameAddress(extendedState.gameContractAddress);
    }
    
    // Determine opponent
    if (extendedState.players.length === 2 && account) {
      const opponentAddress = extendedState.players.find(p => p.toLowerCase() !== account.toLowerCase()) || null;
      setOpponent(opponentAddress);
    }
    
    // Update game phase based on session status
    switch (extendedState.status) {
      case 'WAITING':
        setGamePhase(GamePhase.WAITING_FOR_OPPONENT);
        setStatusMessage('Waiting for opponent to join...');
        break;
      case 'SETUP':
        if (playerBoard) {
          setGamePhase(GamePhase.WAITING_FOR_OPPONENT_BOARD);
          setStatusMessage('Waiting for opponent to place ships...');
        } else {
          setGamePhase(GamePhase.PLACING_SHIPS);
          setStatusMessage('Place your ships on the board');
        }
        break;
      case 'ACTIVE':
        setGamePhase(GamePhase.PLAYING);
        
        // Determine if it's player's turn
        if (extendedState.currentTurn && account) {
          const isMyTurn = extendedState.currentTurn.toLowerCase() === account.toLowerCase();
          setIsPlayerTurn(isMyTurn);
          setStatusMessage(isMyTurn ? 'Your turn - Make a shot!' : "Opponent's turn");
        }
        break;
      case 'COMPLETED':
        setGamePhase(GamePhase.GAME_OVER);
        if (extendedState.winner && account) {
          const didPlayerWin = extendedState.winner.toLowerCase() === account.toLowerCase();
          setStatusMessage(didPlayerWin ? 'You won the game!' : 'You lost the game');
          setWinner(extendedState.winner);
        } else {
          setStatusMessage('Game over');
        }
        break;
    }
  }, [sessionState, account, playerBoard]);
  
  // Process game events
  useEffect(() => {
    if (!events.length) return;
    
    // Process the latest event
    const latestEvent = events[events.length - 1];
    
    switch (latestEvent.type) {
      case 'board_submitted':
        if (latestEvent.player.toLowerCase() === account?.toLowerCase()) {
          // Player's own board was submitted
          setGamePhase(GamePhase.WAITING_FOR_OPPONENT_BOARD);
          setStatusMessage('Waiting for opponent to place ships...');
        } else if (latestEvent.allBoardsSubmitted) {
          // Both boards submitted, game can start
          setGamePhase(GamePhase.PLAYING);
          setStatusMessage('Game started - Get ready!');
        }
        break;
      
      case 'shot_fired':
        if (latestEvent.player.toLowerCase() !== account?.toLowerCase()) {
          // Opponent fired a shot at player
          setIsProcessingShot(true);
          setStatusMessage('Processing opponent shot...');
          
          // Process the shot automatically
          handleOpponentShot(latestEvent.x, latestEvent.y);
        }
        break;
      
      case 'shot_result':
        if (latestEvent.player.toLowerCase() === account?.toLowerCase()) {
          // Player's shot result
          const newShotMap = addShot(
            shotsAtOpponent,
            latestEvent.x,
            latestEvent.y,
            latestEvent.isHit
          );
          setShotsAtOpponent(newShotMap);
          
          // Check if all ships sunk
        //   if (latestEvent.isHit && checkAllShipsSunk) {
        //     // This is just a placeholder - the actual implementation should check if all ships are sunk
        //     // and then generate the end game proof if needed
        //   }
          
          setIsMakingShot(false);
        } else {
          // Opponent's shot result
          const newShotMap = addShot(
            shotsAtPlayer,
            latestEvent.x,
            latestEvent.y,
            latestEvent.isHit
          );
          setShotsAtPlayer(newShotMap);
          setIsProcessingShot(false);
        }
        break;
      
      case 'game_over':
        setGamePhase(GamePhase.GAME_OVER);
        setWinner(latestEvent.winner);
        setStatusMessage(
          latestEvent.winner.toLowerCase() === account?.toLowerCase()
            ? 'You won the game!'
            : 'You lost the game'
        );
        break;
    }
  }, [events, account, shotsAtOpponent, shotsAtPlayer]);
  
  // Handle player board completion
  const handleBoardComplete = useCallback(async (board: Board) => {
    if (!account || !gameAddress) {
      setStatusMessage('Error: Wallet not connected or game not initialized');
      return;
    }
    
    setIsSubmittingBoard(true);
    setStatusMessage('Generating ZK proof for board...');
    
    try {
      // Generate salt for board commitment
      const salt = generateSalt();
      
      // Generate board commitment
      const commitment = generateBoardCommitment(board, salt);
      
      // Generate ZK proof for board placement
      const proof = await generateBoardProof(board, salt);
      
      // Store board state for later use
      setPlayerBoard(board);
      setPlayerBoardCommitment(commitment);
      setPlayerBoardSalt(salt);
      
      // Submit board to contract
      await contractSubmitBoard(gameAddress, commitment, proof);
      
      // Update session on backend
      await sessionSubmitBoard(account, commitment);
      
      setStatusMessage('Board submitted successfully! Waiting for opponent...');
      setGamePhase(GamePhase.WAITING_FOR_OPPONENT_BOARD);
    } catch (error) {
      console.error('Error submitting board:', error);
      setStatusMessage('Error submitting board. Please try again.');
    } finally {
      setIsSubmittingBoard(false);
    }
  }, [account, gameAddress, contractSubmitBoard, sessionSubmitBoard]);
  
  // Handle player making a shot
  const handleMakeShot = useCallback(async (x: number, y: number) => {
    if (!account || !gameAddress || !isPlayerTurn || isMakingShot) return;
    
    setIsMakingShot(true);
    setStatusMessage(`Firing at (${String.fromCharCode(65 + x)}${y + 1})...`);
    
    try {
      // Make shot on contract
      await contractMakeShot(gameAddress, x, y);
      
      // Update turn state
      setIsPlayerTurn(false);
      setStatusMessage("Shot fired! Waiting for opponent's response...");
    } catch (error) {
      console.error('Error making shot:', error);
      setStatusMessage('Error making shot. Please try again.');
      setIsMakingShot(false);
    }
  }, [account, gameAddress, isPlayerTurn, isMakingShot, contractMakeShot]);
  
  // Handle opponent's shot
  const handleOpponentShot = useCallback(async (x: number, y: number) => {
    if (!account || !gameAddress || !playerBoard || !playerBoardSalt) {
      console.error('Cannot process opponent shot: Missing required data');
      return;
    }
    
    try {
      // Check if the shot hit a ship
      const isHit = checkShotResult(playerBoard, x, y);
      
      // Generate ZK proof for the shot result
      const proof = await generateShotProof(playerBoard, x, y, isHit, playerBoardSalt);
      
      // Submit the shot result to the contract
      await contractSubmitShotResult(gameAddress, x, y, isHit, proof);
      
      // Update player's turn
      setIsPlayerTurn(true);
      setStatusMessage(isHit ? 'Your ship was hit! Your turn now.' : 'They missed! Your turn now.');
      
      // Update shots at player
      const newShotMap = addShot(shotsAtPlayer, x, y, isHit);
      setShotsAtPlayer(newShotMap);
      
      // Check if all ships are sunk
      if (isHit && checkAllShipsSunk && playerBoardCommitment) {
        const allSunk = checkAllShipsSunk(playerBoard, newShotMap);
        if (allSunk) {
          // Generate game end proof
          const endProof = await generateGameEndProof(playerBoard, newShotMap, playerBoardSalt);
          
          // Verify game end on contract
          await contractVerifyGameEnd(gameAddress, endProof);
          
          setStatusMessage('All your ships have been sunk! Game over.');
          setGamePhase(GamePhase.GAME_OVER);
        }
      }
    } catch (error) {
      console.error('Error processing opponent shot:', error);
      setStatusMessage('Error processing opponent shot. Please refresh the page.');
    } finally {
      setIsProcessingShot(false);
    }
  }, [account, gameAddress, playerBoard, playerBoardSalt, playerBoardCommitment, shotsAtPlayer, contractSubmitShotResult, contractVerifyGameEnd]);
  
  // Handle forfeit
  const handleForfeit = useCallback(async () => {
    if (!gameAddress) return;
    
    if (confirm('Are you sure you want to forfeit the game?')) {
      try {
        await contractForfeit(gameAddress);
        setStatusMessage('You forfeited the game');
        setGamePhase(GamePhase.GAME_OVER);
      } catch (error) {
        console.error('Error forfeiting:', error);
        setStatusMessage('Error forfeiting game');
      }
    }
  }, [gameAddress, contractForfeit]);
  
  // Render appropriate UI based on game phase
  const renderGameContent = () => {
    switch (gamePhase) {
      case GamePhase.CONNECTING:
        return (
          <div className="text-center py-8">
            <h2 className="text-xl font-bold mb-4">Connecting to Game...</h2>
            <div className="animate-spin h-10 w-10 border-4 border-blue-500 border-t-transparent rounded-full mx-auto"></div>
          </div>
        );
      
      case GamePhase.WAITING_FOR_OPPONENT:
        return (
          <div className="text-center py-8">
            <h2 className="text-xl font-bold mb-4">Waiting for Opponent</h2>
            <p>Share this link with your opponent:</p>
            <div className="bg-gray-100 p-3 rounded mt-2 mb-4">
              <code>{`${typeof window !== 'undefined' ? window.location.origin : ''}/invite/${id}`}</code>
            </div>
            <div className="animate-pulse text-blue-500">Waiting for opponent to join...</div>
          </div>
        );
      
      case GamePhase.PLACING_SHIPS:
        return (
          <div className="py-4">
            <ShipPlacement 
              onComplete={handleBoardComplete} 
            />
            {isSubmittingBoard && (
              <div className="mt-4 text-center">
                <div className="animate-spin h-6 w-6 border-4 border-blue-500 border-t-transparent rounded-full mx-auto mb-2"></div>
                <p>Submitting board and generating ZK proof...</p>
              </div>
            )}
          </div>
        );
      
      case GamePhase.WAITING_FOR_OPPONENT_BOARD:
        return (
          <div className="py-8">
            <h2 className="text-xl font-bold mb-4 text-center">Your Board</h2>
            <div className="flex justify-center">
              {playerBoard && (
                <GameBoard
                  board={playerBoard}
                  shotMap={shotsAtPlayer}
                  isOpponentBoard={false}
                  isPlayerTurn={false}
                  disabled
                />
              )}
            </div>
            <div className="text-center mt-4 animate-pulse text-blue-500">
              Waiting for opponent to place ships...
            </div>
          </div>
        );
      
      case GamePhase.PLAYING:
        return (
          <div className="py-4">
            <h2 className="text-2xl font-bold mb-6 text-center">Battle in Progress</h2>
            <div className="flex flex-col md:flex-row justify-center items-center md:items-start gap-8">
              {/* Player's board */}
              <div>
                {playerBoard && (
                  <GameBoard
                    board={playerBoard}
                    shotMap={shotsAtPlayer}
                    isOpponentBoard={false}
                    isPlayerTurn={isPlayerTurn}
                    disabled={isProcessingShot}
                  />
                )}
              </div>
              
              {/* Opponent's board */}
              <div>
                <GameBoard
                  board={null} // We don't know opponent's board
                  shotMap={shotsAtOpponent}
                  isOpponentBoard={true}
                  isPlayerTurn={isPlayerTurn}
                  disabled={!isPlayerTurn || isMakingShot}
                  onCellClick={handleMakeShot}
                />
              </div>
            </div>
            
            <div className="mt-6 text-center">
              <p className="text-lg mb-4">{statusMessage}</p>
              <button
                className="bg-red-500 hover:bg-red-600 text-white py-2 px-4 rounded"
                onClick={handleForfeit}
              >
                Forfeit Game
              </button>
            </div>
          </div>
        );
      
      case GamePhase.GAME_OVER:
        return (
          <div className="py-8 text-center">
            <h2 className="text-3xl font-bold mb-4">Game Over</h2>
            <p className="text-xl mb-6">
              {winner && account ? (
                winner.toLowerCase() === account.toLowerCase() ? (
                  <span className="text-green-600">You won! Congratulations!</span>
                ) : (
                  <span className="text-red-600">You lost. Better luck next time!</span>
                )
              ) : (
                <span>Game has ended</span>
              )}
            </p>
            
            <div className="flex flex-col md:flex-row justify-center items-center md:items-start gap-8 mb-8">
              {/* Player's final board */}
              {playerBoard && (
                <div>
                  <h3 className="text-lg font-semibold mb-2">Your Board</h3>
                  <GameBoard
                    board={playerBoard}
                    shotMap={shotsAtPlayer}
                    isOpponentBoard={false}
                    isPlayerTurn={false}
                    disabled
                  />
                </div>
              )}
              
              {/* Opponent's shots */}
              <div>
                <h3 className="text-lg font-semibold mb-2">Opponent&apos;s Board</h3>
                <GameBoard
                  board={null}
                  shotMap={shotsAtOpponent}
                  isOpponentBoard={true}
                  isPlayerTurn={false}
                  disabled
                />
              </div>
            </div>
            
            <div className="flex flex-col gap-4 max-w-md mx-auto">
              <button
                className="bg-blue-500 hover:bg-blue-600 text-white py-3 px-6 rounded-lg"
                onClick={() => router.push('/')}
              >
                Return to Home
              </button>
              <button
                className="bg-green-500 hover:bg-green-600 text-white py-3 px-6 rounded-lg"
                onClick={() => router.push('/create')}
              >
                Start New Game
              </button>
            </div>
          </div>
        );
    }
  };
  
  return (
    <div className="container mx-auto px-4 py-6">
      <h1 className="text-3xl font-bold mb-2 text-center">ZK Battleship</h1>
      <p className="text-gray-600 mb-6 text-center">Game ID: {id}</p>
      
      {!isConnected ? (
        <div className="text-center py-16">
          <p className="text-xl mb-4">Please connect your wallet to join the game</p>
          <button
            className="bg-blue-500 hover:bg-blue-600 text-white py-2 px-4 rounded"
            onClick={connectWallet}
          >
            Connect Wallet
          </button>
        </div>
      ) : (
        renderGameContent()
      )}
    </div>
  );
}