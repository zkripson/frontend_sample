// Contract addresses and ABIs for ZK Battleship

export const CONTRACT_ADDRESSES = {
  testnet: {
    zkVerifier: "0xf463Fc86FfC9eea4e4eF43632D7642a9d45Ba775",
    gameImplementation: "0x30874dadcB172CA21706Bd64d9181794CbF3A468",
    gameFactory: "0x75d67fc7a0d77128416d2D55b00c857e780999d7",
    shipToken: "0x8dA0a30376858082A9c21c06416c89C7979bAB88"
  }
};

// Simplified ABIs with only the functions we need
export const GAME_FACTORY_ABI = [
  // Function to create a new game
  "function createGame(address opponent) external returns (uint256 gameId)",
  // Function to get a game address by ID
  "function games(uint256 gameId) external view returns (address)",
  // Function to get a player's games
  "function playerGames(address player) external view returns (uint256[])",
  // Function to join a game
  "function joinGame(uint256 gameId) external",
  // Function to cancel a game
  "function cancelGame(uint256 gameId) external",
  // Event emitted when a game is created
  "event GameCreated(uint256 indexed gameId, address indexed gameAddress, address player1, address player2)"
];

export const BATTLESHIP_GAME_ABI = [
  // Submit board with ZK proof
  "function submitBoard(bytes32 boardCommitment, bytes calldata zkProof) external",
  // Make a shot
  "function makeShot(uint8 x, uint8 y) external",
  // Submit result of a shot with proof
  "function submitShotResult(uint8 x, uint8 y, bool isHit, bytes calldata zkProof) external",
  // Verify game ending
  "function verifyGameEnd(bytes32 boardCommitment, bytes calldata zkProof) external",
  // Forfeit game
  "function forfeit() external",
  // Board state getters
  "function hasShot(address player, uint8 x, uint8 y) external view returns (bool)",
  "function hasHit(address player, uint8 x, uint8 y) external view returns (bool)",
  "function getHitCount(address player) external view returns (uint8)",
  // Game state getters
  "function state() external view returns (uint8)",
  "function player1() external view returns (address)",
  "function player2() external view returns (address)",
  "function currentTurn() external view returns (address)",
  "function winner() external view returns (address)",
  // Events
  "event ShotFired(address indexed shooter, uint8 x, uint8 y)",
  "event ShotResult(address indexed target, uint8 x, uint8 y, bool hit)",
  "event GameStateChanged(uint8 newState)",
  "event GameCompleted(address indexed winner, uint256 endTime)"
];

export const SHIP_TOKEN_ABI = [
  // Standard ERC20 functions
  "function balanceOf(address owner) external view returns (uint256)",
  "function transfer(address to, uint256 amount) external returns (bool)",
  // Game reward functions
  "event RewardMinted(address indexed player, bool isWinner, uint256 amount)"
];

// MegaETH configuration
export const MEGAETH_CONFIG = {
  rpcUrl: "https://carrot.megaeth.com/rpc",
  chainId: 6342
};

// Backend API config
export const BACKEND_CONFIG = {
  apiUrl: "https://zk-battleship-backend.nj-345.workers.dev/",
  wsUrl: "wss://https://zk-battleship-backend.nj-345.workers.dev/"
};