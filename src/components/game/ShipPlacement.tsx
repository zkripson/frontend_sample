/* eslint-disable @typescript-eslint/no-explicit-any */
import React, { useState, useRef, useEffect } from 'react';
import { Ship, Board } from '../../libs/zk/boardProver';
import {
  BOARD_SIZE,
  GRID_SIZE,
  ShipType,
  SHIP_COLORS,
  createEmptyBoard,
  isValidPlacement,
  addShipToBoard,
  getBoardCoordinates,
  createBoardView,
  CellState
} from '../../libs/utils/board-utils';

// Props for ShipPlacement component
interface ShipPlacementProps {
  onComplete: (board: Board) => void;
  initialBoard?: Board;
}

// Ship placement component for setting up the game
const ShipPlacement: React.FC<ShipPlacementProps> = ({ 
  onComplete, 
  initialBoard 
}) => {
  // State for the current board
  const [board, setBoard] = useState<Board>(initialBoard || createEmptyBoard());
  
  // State for the ship being placed
  const [placingShip, setPlacingShip] = useState<Ship | null>(null);
  
  // State for ships to place
  const [shipsToPlace, setShipsToPlace] = useState<ShipType[]>([
    ShipType.CARRIER,      // 5
    ShipType.BATTLESHIP,   // 4
    ShipType.CRUISER,      // 3
    ShipType.SUBMARINE,    // 2
    ShipType.DESTROYER     // 1
  ]);
  
  // Ref for the board container
  const boardRef = useRef<HTMLDivElement>(null);
  
  // State for hover position
  const [hoverPosition, setHoverPosition] = useState<{ x: number; y: number } | null>(null);
  
  // Current ship orientation
  const [isHorizontal, setIsHorizontal] = useState<boolean>(true);
  
  // Initialize with a random board if one is not provided
  useEffect(() => {
    if (!initialBoard && board.ships.length === 0) {
      // Empty board with no ships placed yet
    }
  }, [initialBoard, board.ships.length]);
  
  // Start placing the next ship when previous is placed
  useEffect(() => {
    if (shipsToPlace.length > 0 && !placingShip) {
      setPlacingShip({
        size: shipsToPlace[0],
        x: 0,
        y: 0,
        horizontal: isHorizontal
      });
    } else if (shipsToPlace.length === 0 && !placingShip) {
      // All ships placed
    }
  }, [shipsToPlace, placingShip, isHorizontal]);
  
  // Handle rotation of ship (spacebar)
  useEffect(() => {
    const handleKeyDown = (event: KeyboardEvent) => {
      if (event.code === 'Space' && placingShip) {
        event.preventDefault();
        setIsHorizontal(!isHorizontal);
        setPlacingShip({
          ...placingShip,
          horizontal: !isHorizontal
        });
      }
    };
    
    window.addEventListener('keydown', handleKeyDown);
    return () => {
      window.removeEventListener('keydown', handleKeyDown);
    };
  }, [placingShip, isHorizontal]);
  
  // Handle mouse movement for ship placement
  const handleMouseMove = (event: React.MouseEvent<HTMLDivElement>) => {
    if (!placingShip || !boardRef.current) return;
    
    const coords = getBoardCoordinates(event, boardRef as React.RefObject<HTMLDivElement>);
    if (coords) {
      setHoverPosition(coords);
      setPlacingShip({
        ...placingShip,
        x: coords.x,
        y: coords.y,
        horizontal: isHorizontal
      });
    } else {
      setHoverPosition(null);
    }
  };
  
  // Handle mouse leave
  const handleMouseLeave = () => {
    setHoverPosition(null);
  };
  
  // Handle click to place a ship
  const handleBoardClick = () => {
    if (!placingShip || !hoverPosition) return;
    
    try {
      // Check if placement is valid
      const isValid = isValidPlacement(board, placingShip);
      
      if (isValid) {
        // Add ship to board
        const newBoard = addShipToBoard(board, placingShip);
        
        // Update board
        setBoard(newBoard);
        
        // Remove ship from ships to place
        const newShipsToPlace = [...shipsToPlace];
        newShipsToPlace.shift();
        setShipsToPlace(newShipsToPlace);
        
        // Clear placing ship
        setPlacingShip(null);
      }
    } catch (error) {
      console.error('Invalid ship placement:', error);
    }
  };
  
  // Handle random placement
  const handleRandomPlacement = () => {
    import('../../libs/zk/boardProver').then(({ generateRandomBoard }) => {
      const randomBoard = generateRandomBoard();
      setBoard(randomBoard);
      setShipsToPlace([]); // All ships placed
      setPlacingShip(null);
    });
  };
  
  // Handle completion of ship placement
  const handleComplete = () => {
    if (shipsToPlace.length === 0) {
      onComplete(board);
    }
  };
  
  // Handle resetting the board
  const handleReset = () => {
    setBoard(createEmptyBoard());
    setShipsToPlace([
      ShipType.CARRIER,
      ShipType.BATTLESHIP,
      ShipType.CRUISER,
      ShipType.SUBMARINE,
      ShipType.DESTROYER
    ]);
    setPlacingShip(null);
  };
  
  // Create the board view
  const boardView = createBoardView(board, { hits: [], misses: [] }, false);
  
  // Check if ship placement is valid
  const isValidCurrentPlacement = placingShip && hoverPosition ? 
    (() => {
      try {
        return isValidPlacement(board, placingShip);
      } catch {
        return false;
      }
    })() : false;
  
  // Helper function to safely get ship color
  const getShipColor = (shipSize: number): string => {
    // Using type assertion to tell TypeScript that shipSize is a valid key
    if (shipSize === 5 || shipSize === 4 || shipSize === 3 || shipSize === 2 || shipSize === 1) {
      return SHIP_COLORS[shipSize as keyof typeof SHIP_COLORS];
    }
    return SHIP_COLORS[ShipType.DESTROYER as keyof typeof SHIP_COLORS]; // Default
  };
  
  return (
    <div className="flex flex-col items-center">
      <h2 className="text-2xl font-bold mb-4">Place Your Ships</h2>
      
      <div className="flex items-start mb-6">
        <div className="mr-8">
          <div
            ref={boardRef}
            className="relative border-2 border-gray-800 bg-blue-900"
            style={{
              width: BOARD_SIZE * GRID_SIZE,
              height: BOARD_SIZE * GRID_SIZE,
              cursor: placingShip ? 'crosshair' : 'default'
            }}
            onMouseMove={handleMouseMove}
            onMouseLeave={handleMouseLeave}
            onClick={handleBoardClick}
          >
            {/* Grid cells */}
            {boardView.map((row: any[], y: number) =>
              row.map((cellState, x) => {
                // Find ship at this position
                const shipAtPosition = cellState === CellState.SHIP ? 
                  board.ships.find((s: any) => 
                    (s.horizontal && y === s.y && x >= s.x && x < s.x + s.size) ||
                    (!s.horizontal && x === s.x && y >= s.y && y < s.y + s.size)
                  ) : null;
                
                // Get color based on ship size
                const bgColor = shipAtPosition ? getShipColor(shipAtPosition.size) : '#1e3a8a'; // Deep blue for empty cells
                
                return (
                  <div
                    key={`${x}-${y}`}
                    className="absolute border border-blue-700"
                    style={{
                      left: x * GRID_SIZE,
                      top: y * GRID_SIZE,
                      width: GRID_SIZE,
                      height: GRID_SIZE,
                      backgroundColor: bgColor,
                      transition: 'background-color 0.2s ease'
                    }}
                  />
                );
              })
            )}
            
            {/* Ship placement preview */}
            {placingShip && hoverPosition && (
              <>
                {Array.from({ length: placingShip.size }).map((_, i) => {
                  const x = placingShip.horizontal ? hoverPosition.x + i : hoverPosition.x;
                  const y = placingShip.horizontal ? hoverPosition.y : hoverPosition.y + i;
                  
                  // Skip if out of bounds
                  if (x >= BOARD_SIZE || y >= BOARD_SIZE) return null;
                  
                  return (
                    <div
                      key={`preview-${i}`}
                      className={`absolute border ${isValidCurrentPlacement ? 'border-green-500' : 'border-red-500'}`}
                      style={{
                        left: x * GRID_SIZE,
                        top: y * GRID_SIZE,
                        width: GRID_SIZE,
                        height: GRID_SIZE,
                        backgroundColor: isValidCurrentPlacement ? 
                          'rgba(34, 197, 94, 0.4)' : // Green with transparency
                          'rgba(239, 68, 68, 0.4)', // Red with transparency
                        pointerEvents: 'none'
                      }}
                    />
                  );
                })}
              </>
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
        </div>
        
        <div className="bg-gray-100 p-4 rounded-lg">
          <h3 className="text-lg font-semibold mb-2">Ships</h3>
          
          <div className="mb-4">
            {shipsToPlace.length > 0 ? (
              <>
                <p className="font-medium">Currently placing:</p>
                <div className="flex items-center mb-2">
                  <div
                    className="w-6 h-6 mr-2"
                    style={{ 
                      backgroundColor: getShipColor(shipsToPlace[0]) 
                    }}
                  ></div>
                  <span>
                    {ShipType[shipsToPlace[0]]} ({shipsToPlace[0]} cells)
                  </span>
                </div>
                
                <p className="text-sm text-gray-600 italic">
                  Press spacebar to rotate ship
                </p>
              </>
            ) : (
              <p className="text-green-600">All ships placed!</p>
            )}
          </div>
          
          <div className="flex flex-col gap-2">
            <button
              className="bg-blue-500 hover:bg-blue-600 text-white py-2 px-4 rounded"
              onClick={handleRandomPlacement}
            >
              Random Placement
            </button>
            
            <button
              className="bg-red-500 hover:bg-red-600 text-white py-2 px-4 rounded"
              onClick={handleReset}
            >
              Reset
            </button>
            
            <button
              className={`${
                shipsToPlace.length === 0
                  ? 'bg-green-500 hover:bg-green-600'
                  : 'bg-gray-400 cursor-not-allowed'
              } text-white py-2 px-4 rounded mt-4`}
              disabled={shipsToPlace.length > 0}
              onClick={handleComplete}
            >
              Done
            </button>
          </div>
        </div>
      </div>
      
      <div className="text-gray-600 max-w-lg">
        <h3 className="font-semibold mb-2">How to place ships:</h3>
        <ul className="list-disc pl-5 space-y-1">
          <li>Click on the board to place the current ship</li>
          <li>Press spacebar to rotate ship between horizontal and vertical</li>
          <li>Ships cannot touch each other (even diagonally)</li>
          <li>Use &quot;Random Placement&quot; for quick setup</li>
        </ul>
      </div>
    </div>
  );
};

export default ShipPlacement;