import React from 'react';

// Props for GameControls component
interface GameControlsProps {
  gamePhase: GamePhase;
  isPlayerTurn: boolean;
  statusMessage: string;
  winner: string | null;
  playerAddress: string | null;
  opponentAddress: string | null;
  onForfeit: () => void;
  onRestart?: () => void;
  isBusy?: boolean;
}

type GamePhase = 'CONNECTING' | 'WAITING_FOR_OPPONENT' | 'PLACING_SHIPS' | 'WAITING_FOR_OPPONENT_BOARD' | 'PLAYING' | 'GAME_OVER';

// Game controls component
const GameControls: React.FC<GameControlsProps> = ({
  gamePhase,
  isPlayerTurn,
  statusMessage,
  winner,
  playerAddress,
  opponentAddress,
  onForfeit,
  onRestart,
  isBusy = false
}) => {
  // Format address for display
  const formatAddress = (address: string | null) => {
    if (!address) return 'Unknown';
    return `${address.slice(0, 6)}...${address.slice(-4)}`;
  };
  
  // Determine current turn indicator
  const renderTurnIndicator = () => {
    if (gamePhase !== 'PLAYING') return null;
    
    return (
      <div className="flex justify-center items-center mb-4">
        <div className={`h-3 w-3 rounded-full ${isPlayerTurn ? 'bg-green-500' : 'bg-red-500'} mr-2`} />
        <span>
          {isPlayerTurn ? "Your turn" : "Opponent's turn"}
        </span>
      </div>
    );
  };
  
  // Render game controls based on phase
  return (
    <div className="bg-white rounded-lg shadow-md p-4 mb-6">
      <h2 className="text-xl font-bold mb-2 text-center">Game Status</h2>
      
      {renderTurnIndicator()}
      
      <div className="mb-4">
        <p className="text-center font-medium text-lg mb-2">{statusMessage}</p>
        
        {/* Player info */}
        <div className="flex justify-between px-2 py-3 bg-gray-50 rounded-lg mb-2">
          <div>
            <span className="text-sm text-gray-500">You:</span>
            <span className="ml-2 text-blue-600 font-medium">{formatAddress(playerAddress)}</span>
          </div>
          <div>
            <span className="text-sm text-gray-500">Opponent:</span>
            <span className="ml-2 text-red-600 font-medium">{formatAddress(opponentAddress)}</span>
          </div>
        </div>
        
        {/* Game phase indicator */}
        <div className="flex justify-center mt-4">
          <div className="inline-block px-3 py-1 rounded-full text-sm font-medium" 
            style={{
              backgroundColor: 
                gamePhase === 'CONNECTING' ? '#f3f4f6' :
                gamePhase === 'WAITING_FOR_OPPONENT' ? '#dbeafe' :
                gamePhase === 'PLACING_SHIPS' ? '#e0f2fe' :
                gamePhase === 'WAITING_FOR_OPPONENT_BOARD' ? '#ede9fe' :
                gamePhase === 'PLAYING' ? '#dcfce7' :
                gamePhase === 'GAME_OVER' ? '#fee2e2' : '#f3f4f6',
              color:
                gamePhase === 'CONNECTING' ? '#4b5563' :
                gamePhase === 'WAITING_FOR_OPPONENT' ? '#2563eb' :
                gamePhase === 'PLACING_SHIPS' ? '#0284c7' :
                gamePhase === 'WAITING_FOR_OPPONENT_BOARD' ? '#7c3aed' :
                gamePhase === 'PLAYING' ? '#16a34a' :
                gamePhase === 'GAME_OVER' ? '#dc2626' : '#4b5563'
            }}
          >
            {gamePhase.replace(/_/g, ' ')}
          </div>
        </div>
      </div>
      
      {/* Action buttons */}
      <div className="flex justify-center gap-4">
        {gamePhase === 'PLAYING' && (
          <button
            className={`py-2 px-4 rounded ${isBusy ? 'bg-gray-400 cursor-not-allowed' : 'bg-red-500 hover:bg-red-600'} text-white`}
            onClick={onForfeit}
            disabled={isBusy}
          >
            Forfeit Game
          </button>
        )}
        
        {gamePhase === 'GAME_OVER' && onRestart && (
          <button
            className="py-2 px-4 rounded bg-green-500 hover:bg-green-600 text-white"
            onClick={onRestart}
          >
            Play Again
          </button>
        )}
      </div>
      
      {/* Winner announcement */}
      {gamePhase === 'GAME_OVER' && winner && (
        <div className={`mt-4 p-3 rounded-lg text-center ${
          winner === playerAddress ? 'bg-green-100 text-green-800' : 'bg-red-100 text-red-800'
        }`}>
          <p className="font-bold text-lg">
            {winner === playerAddress ? '🎉 You Won! 🎉' : '😞 You Lost 😞'}
          </p>
          <p className="text-sm mt-1">
            {winner === playerAddress
              ? 'Congratulations! You sunk all enemy ships!'
              : 'Better luck next time! All your ships were sunk.'}
          </p>
        </div>
      )}
    </div>
  );
};

export default GameControls;