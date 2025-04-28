import { ethers } from 'ethers';
import { Board, generateBoardCommitment } from './boardProver';
import { generateProof, CIRCUIT_PATHS } from './noirConfig';

/**
 * Check if a shot hits a ship on the board
 * @param board The player's board
 * @param x X-coordinate of the shot
 * @param y Y-coordinate of the shot
 * @returns true if hit, false if miss
 */
export function checkShotResult(board: Board, x: number, y: number): boolean {
  // Check bounds
  if (x < 0 || x >= 10 || y < 0 || y >= 10) {
    throw new Error(`Shot coordinates out of bounds: (${x}, ${y})`);
  }
  
  // Check grid value at coordinates
  return board.grid[y][x] === 1;
}

/**
 * Generate a ZK proof for a shot result
 * @param board The player's board being shot at
 * @param x X-coordinate of the shot
 * @param y Y-coordinate of the shot
 * @param isHit Result of the shot (should match board state)
 * @param salt The salt used for the board commitment
 * @returns ZK proof as a hex string
 */
export async function generateShotProof(
  board: Board,
  x: number,
  y: number,
  isHit: boolean,
  salt: string
): Promise<string> {
  try {
    // Verify that the claimed result matches the actual board state
    const actualResult = checkShotResult(board, x, y);
    if (actualResult !== isHit) {
      throw new Error(`Claimed shot result (${isHit}) doesn't match board state (${actualResult})`);
    }
    
    // Convert board to Noir-compatible format
    const boardCells = new Array(100).fill(0);
    // Fill in ship positions with 1s
    for (let y = 0; y < 10; y++) {
      for (let x = 0; x < 10; x++) {
        if (board.grid[y][x] === 1) {
          boardCells[y * 10 + x] = 1;
        }
      }
    }
    
    // Calculate board commitment for verification
    const boardCommitment = generateBoardCommitment(board, salt);
    
    // Prepare circuit input
    const input = {
      board: { cells: boardCells },
      shot_x: x,
      shot_y: y,
      is_hit: isHit ? 1 : 0, // Convert boolean to 0/1 for Noir
      salt: salt,
      board_commitment: boardCommitment
    };
    
    // Use shared proof generation utility
    return await generateProof(CIRCUIT_PATHS.SHOT_RESULT, input);
  } catch (error) {
    console.error("Error generating shot proof:", error);
    throw error;
  }
}

/**
 * Track shots on a board and update a shot map
 */
export interface ShotMap {
  hits: {x: number, y: number}[];
  misses: {x: number, y: number}[];
}

/**
 * Create a new empty shot map
 */
export function createEmptyShotMap(): ShotMap {
  return {
    hits: [],
    misses: []
  };
}

/**
 * Add a shot to the shot map
 * @param shotMap The current shot map
 * @param x X-coordinate of the shot
 * @param y Y-coordinate of the shot
 * @param isHit Whether the shot was a hit
 * @returns Updated shot map
 */
export function addShot(shotMap: ShotMap, x: number, y: number, isHit: boolean): ShotMap {
  // Create a new shot map to avoid mutations
  const newShotMap = {
    hits: [...shotMap.hits],
    misses: [...shotMap.misses]
  };
  
  if (isHit) {
    newShotMap.hits.push({x, y});
  } else {
    newShotMap.misses.push({x, y});
  }
  
  return newShotMap;
}

/**
 * Check if all ships on a board have been hit
 * @param board The player's board
 * @param shotMap The opponent's shot map
 * @returns true if all ships are sunk
 */
export function checkAllShipsSunk(board: Board, shotMap: ShotMap): boolean {
  // Count total ship cells on the board
  const totalShipCells = board.grid.flat().filter(cell => cell === 1).length;
  
  // Count total hits
  const totalHits = shotMap.hits.length;
  
  // All ships are sunk if total hits equals total ship cells
  return totalHits === totalShipCells;
}

/**
 * Generate a ZK proof that all ships have been sunk
 * @param board The player's board
 * @param shotMap The opponent's shot map
 * @param salt The salt used for the board commitment
 * @returns ZK proof as a hex string
 */
export async function generateGameEndProof(board: Board, shotMap: ShotMap, salt: string): Promise<string> {
  try {
    // Verify that all ships are actually sunk
    const allSunk = checkAllShipsSunk(board, shotMap);
    if (!allSunk) {
      throw new Error("Not all ships are sunk, cannot generate game end proof");
    }
    
    // Convert board to Noir-compatible format
    const boardCells = new Array(100).fill(0);
    // Fill in ship positions with 1s
    for (let y = 0; y < 10; y++) {
      for (let x = 0; x < 10; x++) {
        if (board.grid[y][x] === 1) {
          boardCells[y * 10 + x] = 1;
        }
      }
    }
    
    // Calculate board commitment for verification
    const boardCommitment = generateBoardCommitment(board, salt);
    
    // Create shot history as a bitmap (100 bits total for 10x10 board)
    const shotHistory = new Array(100).fill(0);
    for (const hit of shotMap.hits) {
      shotHistory[hit.y * 10 + hit.x] = 1;
    }
    
    // Calculate shot history hash
    const shotHistoryStr = shotHistory.join('');
    const shotHistoryHash = ethers.utils.keccak256(
      ethers.utils.toUtf8Bytes(shotHistoryStr)
    );
    
    // Prepare circuit input
    const input = {
      board: { cells: boardCells },
      shot_history: shotHistory,
      salt: salt,
      board_commitment: boardCommitment,
      shot_history_hash: shotHistoryHash
    };
    
    // Use shared proof generation utility
    return await generateProof(CIRCUIT_PATHS.GAME_END, input);
  } catch (error) {
    console.error("Error generating game end proof:", error);
    throw error;
  }
}