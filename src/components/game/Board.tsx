import React, { useRef, useEffect, useState } from 'react';
import { Board } from '../../libs/zk/boardProver';
import { ShotMap } from '../../libs/zk/shotProver';
import {
  BOARD_SIZE,
  GRID_SIZE,
  CellState,
  CELL_COLORS,
  createBoardView,
  getBoardCoordinates
} from '../../libs/utils/board-utils';

// Props for GameBoard component
interface GameBoardProps {
  board: Board | null;
  shotMap: ShotMap;
  isOpponentBoard: boolean;
  isPlayerTurn: boolean;
  disabled?: boolean;
  onCellClick?: (x: number, y: number) => void;
}

// Game board component that renders a player's or opponent's board
const GameBoard: React.FC<GameBoardProps> = ({
  board,
  shotMap,
  isOpponentBoard,
  isPlayerTurn,
  disabled = false,
  onCellClick
}) => {
  // Ref for the board container
  const boardRef = useRef<HTMLDivElement>(null);
  
  // State for board view
  const [boardView, setBoardView] = useState<CellState[][]>([]);
  
  // State for hover cell
  const [hoverCell, setHoverCell] = useState<{ x: number; y: number } | null>(null);
  
  // Update board view when board or shotMap changes
  useEffect(() => {
    const view = createBoardView(board, shotMap, isOpponentBoard);
    setBoardView(view);
  }, [board, shotMap, isOpponentBoard]);
  
  // Handle mouse movement for hover effect
  const handleMouseMove = (event: React.MouseEvent<HTMLDivElement>) => {
    if (!isOpponentBoard || !isPlayerTurn || disabled || !boardRef.current) return;
    
    const coords = getBoardCoordinates(event, boardRef as React.RefObject<HTMLDivElement>);
    if (coords) {
      setHoverCell(coords);
    } else {
      setHoverCell(null);
    }
  };
  
  // Handle mouse leave
  const handleMouseLeave = () => {
    setHoverCell(null);
  };
  
  // Handle cell click
  const handleCellClick = (event: React.MouseEvent<HTMLDivElement>) => {
    if (!isOpponentBoard || !isPlayerTurn || disabled || !onCellClick || !boardRef.current) return;
    
    const coords = getBoardCoordinates(event, boardRef as React.RefObject<HTMLDivElement>);
    if (coords) {
      // Check if cell has already been shot at
      const cellState = boardView[coords.y][coords.x];
      if (cellState === CellState.HIT || cellState === CellState.MISS || cellState === CellState.SUNK) {
        return; // Already shot at this cell
      }
      
      onCellClick(coords.x, coords.y);
    }
  };
  
  // Render the game board
  return (
    <div className="flex flex-col items-center">
      <h2 className="text-xl font-bold mb-2">
        {isOpponentBoard ? "Opponent's Board" : "Your Board"}
      </h2>
      
      <div
        ref={boardRef}
        className="relative border-2 border-gray-800 bg-blue-900"
        style={{
          width: BOARD_SIZE * GRID_SIZE,
          height: BOARD_SIZE * GRID_SIZE,
          cursor: isOpponentBoard && isPlayerTurn && !disabled ? 'crosshair' : 'default'
        }}
        onMouseMove={handleMouseMove}
        onMouseLeave={handleMouseLeave}
        onClick={handleCellClick}
      >
        {/* Grid cells */}
        {boardView.map((row, y) =>
          row.map((cellState, x) => (
            <div
              key={`${x}-${y}`}
              className="absolute border border-blue-700"
              style={{
                left: x * GRID_SIZE,
                top: y * GRID_SIZE,
                width: GRID_SIZE,
                height: GRID_SIZE,
                backgroundColor: CELL_COLORS[cellState],
                transition: 'background-color 0.2s ease'
              }}
            />
          ))
        )}
        
        {/* Hover effect for opponent's board */}
        {isOpponentBoard && isPlayerTurn && hoverCell && !disabled && (
          <div
            className="absolute border-2 border-yellow-400 bg-yellow-400 bg-opacity-30"
            style={{
              left: hoverCell.x * GRID_SIZE,
              top: hoverCell.y * GRID_SIZE,
              width: GRID_SIZE,
              height: GRID_SIZE,
              pointerEvents: 'none'
            }}
          />
        )}
        
        {/* Coordinate labels */}
        <div className="absolute -top-8 left-0 flex w-full justify-between px-2">
          {Array.from({ length: BOARD_SIZE }).map((_, i) => (
            <div key={i} className="text-center font-bold text-gray-700" style={{ width: GRID_SIZE }}>
              {String.fromCharCode(65 + i)}
            </div>
          ))}
        </div>
        
        <div className="absolute -left-8 top-0 flex flex-col h-full justify-between py-1">
          {Array.from({ length: BOARD_SIZE }).map((_, i) => (
            <div key={i} className="text-center font-bold text-gray-700" style={{ height: GRID_SIZE }}>
              {i + 1}
            </div>
          ))}
        </div>
      </div>
      
      {/* Status indicator */}
      <div className="mt-2 text-center">
        {isOpponentBoard ? (
          isPlayerTurn ? (
            disabled ? (
              <span className="text-yellow-500">Waiting for confirmation...</span>
            ) : (
              <span className="text-green-500">Your turn - Click to fire!</span>
            )
          ) : (
            <span className="text-gray-500">Opponent&apos;s turn</span>
          )
        ) : (
          isPlayerTurn ? (
            <span className="text-blue-500">Your turn</span>
          ) : (
            <span className="text-red-500">Opponent is firing...</span>
          )
        )}
      </div>
    </div>
  );
};

export default GameBoard;