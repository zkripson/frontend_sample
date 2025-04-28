/* eslint-disable @typescript-eslint/no-duplicate-enum-values */
import { Board, Ship } from '../zk/boardProver';
import { ShotMap } from '../zk/shotProver';

// Board size constants
export const BOARD_SIZE = 10;
export const GRID_SIZE = 40; // Cell size in pixels

// Cell states for rendering
export enum CellState {
  EMPTY = 'empty',
  SHIP = 'ship',
  HIT = 'hit',
  MISS = 'miss',
  SUNK = 'sunk',
}

// Ship types
export enum ShipType {
  CARRIER = 5,
  BATTLESHIP = 4,
  CRUISER = 3,
  SUBMARINE = 2,
  DESTROYER = 1,
}

// Cell colors for rendering
export const CELL_COLORS = {
  [CellState.EMPTY]: '#1e3a8a', // Deep blue
  [CellState.SHIP]: '#64748b', // Slate
  [CellState.HIT]: '#dc2626', // Red
  [CellState.MISS]: '#e5e7eb', // Light gray
  [CellState.SUNK]: '#991b1b', // Dark red
};

// Ship colors
export const SHIP_COLORS = {
  [ShipType.CARRIER]: '#475569',
  [ShipType.BATTLESHIP]: '#64748b',
  [ShipType.CRUISER]: '#94a3b8',
  [ShipType.SUBMARINE]: '#cbd5e1',
  [ShipType.DESTROYER]: '#e2e8f0',
};

/**
 * Create a renderable game board from board state and shot map
 * @param board The player's board
 * @param shotMap The shots on this board
 * @param isOpponentView If true, hides ships that haven't been hit
 * @returns 2D array of cell states for rendering
 */
export function createBoardView(
  board: Board | null,
  shotMap: ShotMap,
  isOpponentView: boolean
): CellState[][] {
  // Initialize empty board view
  const boardView: CellState[][] = Array(BOARD_SIZE)
    .fill(0)
    .map(() => Array(BOARD_SIZE).fill(CellState.EMPTY));

  // If there's no board, just show shots
  if (!board) {
    // Fill in hits and misses
    for (const hit of shotMap.hits) {
      boardView[hit.y][hit.x] = CellState.HIT;
    }
    for (const _miss of shotMap.misses) {
      boardView[_miss.y][_miss.x] = CellState.MISS;
    }
    return boardView;
  }

  // Create set of hit positions for faster lookup
  const hitPositions = new Set(
    shotMap.hits.map((hit) => `${hit.x},${hit.y}`)
  );
  const missPositions = new Set(
    shotMap.misses.map((miss) => `${miss.x},${miss.y}`)
  );

  // If this is player's own board view
  if (!isOpponentView) {
    // Show all ships
    for (let y = 0; y < BOARD_SIZE; y++) {
      for (let x = 0; x < BOARD_SIZE; x++) {
        const hasShip = board.grid[y][x] === 1;
        const posKey = `${x},${y}`;
        
        if (hasShip) {
          if (hitPositions.has(posKey)) {
            boardView[y][x] = CellState.HIT;
          } else {
            boardView[y][x] = CellState.SHIP;
          }
        } else if (missPositions.has(posKey)) {
          boardView[y][x] = CellState.MISS;
        }
      }
    }
  } else {
    // Opponent view - only show hits and misses
    for (const hit of shotMap.hits) {
      boardView[hit.y][hit.x] = CellState.HIT;
    }
    for (const miss of shotMap.misses) {
      boardView[miss.y][miss.x] = CellState.MISS;
    }
  }

  // Mark completely sunk ships
  if (board) {
    markSunkShips(board, shotMap, boardView);
  }

  return boardView;
}

/**
 * Mark cells of completely sunk ships
 * @param board The player's board
 * @param shotMap The shots on this board
 * @param boardView The board view to update
 */
function markSunkShips(board: Board, shotMap: ShotMap, boardView: CellState[][]): void {
  // For each ship, check if all its cells are hit
  for (const ship of board.ships) {
    let allCellsHit = true;
    const shipCells: {x: number, y: number}[] = [];
    
    // Get all cells of the ship
    for (let i = 0; i < ship.size; i++) {
      const x = ship.horizontal ? ship.x + i : ship.x;
      const y = ship.horizontal ? ship.y : ship.y + i;
      
      shipCells.push({x, y});
      
      // Check if this cell is hit
      const isHit = shotMap.hits.some(hit => hit.x === x && hit.y === y);
      if (!isHit) {
        allCellsHit = false;
        break;
      }
    }
    
    // If all cells are hit, mark the ship as sunk
    if (allCellsHit) {
      for (const cell of shipCells) {
        boardView[cell.y][cell.x] = CellState.SUNK;
      }
    }
  }
}

/**
 * Check if a ship placement is valid on the board
 * @param board Current board state
 * @param ship Ship to place
 * @returns true if placement is valid
 */
export function isValidPlacement(board: Board, ship: Ship): boolean {
  // Check bounds
  if (ship.horizontal) {
    if (ship.x < 0 || ship.x + ship.size > BOARD_SIZE || ship.y < 0 || ship.y >= BOARD_SIZE) {
      return false;
    }
  } else {
    if (ship.x < 0 || ship.x >= BOARD_SIZE || ship.y < 0 || ship.y + ship.size > BOARD_SIZE) {
      return false;
    }
  }
  
  // Check for collisions with other ships
  for (let i = 0; i < ship.size; i++) {
    const x = ship.horizontal ? ship.x + i : ship.x;
    const y = ship.horizontal ? ship.y : ship.y + i;
    
    // Check cell and surrounding cells
    for (let dx = -1; dx <= 1; dx++) {
      for (let dy = -1; dy <= 1; dy++) {
        const checkX = x + dx;
        const checkY = y + dy;
        
        // Skip out of bounds checks
        if (checkX < 0 || checkX >= BOARD_SIZE || checkY < 0 || checkY >= BOARD_SIZE) {
          continue;
        }
        
        // Check if cell has a ship
        if (board.grid[checkY][checkX] === 1) {
          return false;
        }
      }
    }
  }
  
  return true;
}

/**
 * Add a ship to the board
 * @param board Current board
 * @param ship Ship to add
 * @returns Updated board
 */
export function addShipToBoard(board: Board, ship: Ship): Board {
  // Validate placement
  if (!isValidPlacement(board, ship)) {
    throw new Error('Invalid ship placement');
  }
  
  // Create a new board with the ship added
  const newGrid = board.grid.map(row => [...row]);
  const newShips = [...board.ships, ship];
  
  // Place ship on grid
  for (let i = 0; i < ship.size; i++) {
    const x = ship.horizontal ? ship.x + i : ship.x;
    const y = ship.horizontal ? ship.y : ship.y + i;
    newGrid[y][x] = 1;
  }
  
  return {
    ships: newShips,
    grid: newGrid
  };
}

/**
 * Create an empty board
 * @returns Empty board with no ships
 */
export function createEmptyBoard(): Board {
  return {
    ships: [],
    grid: Array(BOARD_SIZE).fill(0).map(() => Array(BOARD_SIZE).fill(0))
  };
}

/**
 * Get X-Y coordinates from a mouse event on a board
 * @param event Mouse event
 * @param boardRef React ref to the board element
 * @returns X-Y coordinates or null if out of bounds
 */
export function getBoardCoordinates(
  event: React.MouseEvent<HTMLDivElement>,
  boardRef: React.RefObject<HTMLDivElement>
): { x: number; y: number } | null {
  if (!boardRef.current) return null;
  
  const rect = boardRef.current.getBoundingClientRect();
  const x = Math.floor((event.clientX - rect.left) / GRID_SIZE);
  const y = Math.floor((event.clientY - rect.top) / GRID_SIZE);
  
  // Check bounds
  if (x < 0 || x >= BOARD_SIZE || y < 0 || y >= BOARD_SIZE) {
    return null;
  }
  
  return { x, y };
}