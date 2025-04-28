/* eslint-disable @typescript-eslint/no-explicit-any */
import { useState, useCallback } from 'react';
import { 
  useAccount, 
  useConnect, 
  useDisconnect, 
  useChainId,
  useSwitchChain,
  useWriteContract,
} from 'wagmi';
import { megaethTestnet } from 'wagmi/chains'
import { injected } from 'wagmi/connectors';
import { createPublicClient, decodeEventLog, getContract, http } from 'viem';
import {
  CONTRACT_ADDRESSES,
  GAME_FACTORY_ABI,
  BATTLESHIP_GAME_ABI,
  MEGAETH_CONFIG
} from '../libs/contracts/config';

/**
 * Custom hook for interacting with game contracts using wagmi
 */
export function useContracts() {
  // Wagmi hooks
  const { address, isConnected } = useAccount();
  const { connect } = useConnect();
  const { disconnect } = useDisconnect();
  const chainId = useChainId();
  const { switchChain } = useSwitchChain();
  const publicClient = createPublicClient({
    chain: megaethTestnet,
    transport: http(MEGAETH_CONFIG.rpcUrl)
  });
  
  // Contract write hooks
  const { writeContractAsync, isPending: isWritePending } = useWriteContract();
  
  // State
  const [error, setError] = useState<string | null>(null);
  const [isPending, setIsPending] = useState<boolean>(false);
  
  // Check if on correct network
  const isCorrectNetwork = chainId === MEGAETH_CONFIG.chainId;
  
  // Clear error
  const clearError = useCallback(() => {
    setError(null);
  }, []);
  
  // Connect wallet
  const connectWallet = useCallback(async () => {
    try {
      await connect({ connector: injected() });
    } catch (err) {
      console.error('Error connecting wallet:', err);
      setError('Failed to connect wallet');
      throw err;
    }
  }, [connect]);
  
  // Disconnect wallet
  const disconnectWallet = useCallback(() => {
    disconnect();
  }, [disconnect]);
  
  // Switch to MegaETH network
  const switchNetwork = useCallback(async () => {
    if (!switchChain) {
      setError('Network switching not supported in current wallet');
      return;
    }
    
    try {
      await switchChain({ chainId: MEGAETH_CONFIG.chainId });
    } catch (err) {
      console.error('Error switching network:', err);
      setError('Failed to switch to MegaETH network');
      throw err;
    }
  }, [switchChain]);
  
  // Get a game contract instance
  const getGameContract = useCallback((gameAddress: string) => {
    if (!publicClient) return null;
    
    try {
      return getContract({
        address: gameAddress as `0x${string}`,
        abi: BATTLESHIP_GAME_ABI,
        client: publicClient
      });
    } catch (err) {
      console.error('Error getting game contract:', err);
      setError('Failed to get game contract');
      return null;
    }
  }, [publicClient]);
  
  // Create a new game
  const createGame = useCallback(async (opponentAddress: string) => {
    if (!address || !isConnected) {
      throw new Error('Wallet not connected');
    }
    
    if (!isCorrectNetwork) {
      throw new Error('Please switch to MegaETH network');
    }
    
    setIsPending(true);
    
    try {
      // Write to contract
      const hash = await writeContractAsync({
        address: CONTRACT_ADDRESSES.testnet.gameFactory as `0x${string}`,
        abi: GAME_FACTORY_ABI,
        functionName: 'createGame',
        args: [opponentAddress],
      });
      
      // Wait for transaction to be mined
      const receipt = await publicClient?.waitForTransactionReceipt({ hash });
      
      // Find the GameCreated event
      const gameCreatedEvent = receipt?.logs
        .map(log => {
          try {
            return {
              ...decodeEventLog({
                abi: GAME_FACTORY_ABI,
                data: log.data,
                topics: log.topics,
              }),
              logIndex: log.logIndex
            };
          } catch {
            return null;
          }
        })
        .filter(Boolean)
        .find(event => event?.eventName === 'GameCreated');
      
      if (!gameCreatedEvent) {
        throw new Error('Game creation failed: Event not found');
      }
      
      // Extract game ID and address from event
      const gameId = Number(gameCreatedEvent?.args?.[0]);
      const gameAddress = gameCreatedEvent?.args?.[1] as string;
      
      console.log(`Game created: ID=${gameId}, Address=${gameAddress}`);
      setIsPending(false);
      
      return { gameId, gameAddress };
    } catch (err) {
      console.error('Error creating game:', err);
      setError('Failed to create game');
      setIsPending(false);
      throw err;
    }
  }, [address, isConnected, isCorrectNetwork, writeContractAsync, publicClient]);
  
  // Join a game
  const joinGame = useCallback(async (gameId: number) => {
    if (!address || !isConnected) {
      throw new Error('Wallet not connected');
    }
    
    if (!isCorrectNetwork) {
      throw new Error('Please switch to MegaETH network');
    }
    
    setIsPending(true);
    
    try {
      // Write to contract
      const hash = await writeContractAsync({
        address: CONTRACT_ADDRESSES.testnet.gameFactory as `0x${string}`,
        abi: GAME_FACTORY_ABI,
        functionName: 'joinGame',
        args: [gameId],
      });
      
      // Wait for transaction to be mined
      await publicClient?.waitForTransactionReceipt({ hash });
      
      console.log(`Joined game: ID=${gameId}`);
      setIsPending(false);
    } catch (err) {
      console.error('Error joining game:', err);
      setError('Failed to join game');
      setIsPending(false);
      throw err;
    }
  }, [address, isConnected, isCorrectNetwork, writeContractAsync, publicClient]);
  
  // Submit board with ZK proof
  const submitBoard = useCallback(async (
    gameAddress: string,
    boardCommitment: string,
    zkProof: string
  ) => {
    if (!address || !isConnected) {
      throw new Error('Wallet not connected');
    }
    
    if (!isCorrectNetwork) {
      throw new Error('Please switch to MegaETH network');
    }
    
    setIsPending(true);
    
    try {
      // Write to contract
      const hash = await writeContractAsync({
        address: gameAddress as `0x${string}`,
        abi: BATTLESHIP_GAME_ABI,
        functionName: 'submitBoard',
        args: [boardCommitment, zkProof],
      });
      
      // Wait for transaction to be mined
      await publicClient?.waitForTransactionReceipt({ hash });
      
      console.log(`Board submitted for game: ${gameAddress}`);
      setIsPending(false);
    } catch (err) {
      console.error('Error submitting board:', err);
      setError('Failed to submit board');
      setIsPending(false);
      throw err;
    }
  }, [address, isConnected, isCorrectNetwork, writeContractAsync, publicClient]);
  
  // Make a shot at opponent's board
  const makeShot = useCallback(async (
    gameAddress: string,
    x: number,
    y: number
  ) => {
    if (!address || !isConnected) {
      throw new Error('Wallet not connected');
    }
    
    if (!isCorrectNetwork) {
      throw new Error('Please switch to MegaETH network');
    }
    
    setIsPending(true);
    
    try {
      // Write to contract
      const hash = await writeContractAsync({
        address: gameAddress as `0x${string}`,
        abi: BATTLESHIP_GAME_ABI,
        functionName: 'makeShot',
        args: [x, y],
      });
      
      // Wait for transaction to be mined
      await publicClient?.waitForTransactionReceipt({ hash });
      
      console.log(`Shot made at (${x}, ${y}) for game: ${gameAddress}`);
      setIsPending(false);
    } catch (err) {
      console.error('Error making shot:', err);
      setError('Failed to make shot');
      setIsPending(false);
      throw err;
    }
  }, [address, isConnected, isCorrectNetwork, writeContractAsync, publicClient]);
  
  // Submit result of a shot with ZK proof
  const submitShotResult = useCallback(async (
    gameAddress: string,
    x: number,
    y: number,
    isHit: boolean,
    zkProof: string
  ) => {
    if (!address || !isConnected) {
      throw new Error('Wallet not connected');
    }
    
    if (!isCorrectNetwork) {
      throw new Error('Please switch to MegaETH network');
    }
    
    setIsPending(true);
    
    try {
      // Write to contract
      const hash = await writeContractAsync({
        address: gameAddress as `0x${string}`,
        abi: BATTLESHIP_GAME_ABI,
        functionName: 'submitShotResult',
        args: [x, y, isHit, zkProof],
      });
      
      // Wait for transaction to be mined
      await publicClient?.waitForTransactionReceipt({ hash });
      
      console.log(`Shot result submitted at (${x}, ${y}), hit: ${isHit} for game: ${gameAddress}`);
      setIsPending(false);
    } catch (err) {
      console.error('Error submitting shot result:', err);
      setError('Failed to submit shot result');
      setIsPending(false);
      throw err;
    }
  }, [address, isConnected, isCorrectNetwork, writeContractAsync, publicClient]);
  
  // Verify game end with ZK proof
  const verifyGameEnd = useCallback(async (
    gameAddress: string,
    zkProof: string
  ) => {
    if (!address || !isConnected) {
      throw new Error('Wallet not connected');
    }
    
    if (!isCorrectNetwork) {
      throw new Error('Please switch to MegaETH network');
    }
    
    setIsPending(true);
    
    try {
      // Write to contract
      const hash = await writeContractAsync({
        address: gameAddress as `0x${string}`,
        abi: BATTLESHIP_GAME_ABI,
        functionName: 'verifyGameEnd',
        args: [zkProof],
      });
      
      // Wait for transaction to be mined
      await publicClient?.waitForTransactionReceipt({ hash });
      
      console.log(`Game end verified for game: ${gameAddress}`);
      setIsPending(false);
    } catch (err) {
      console.error('Error verifying game end:', err);
      setError('Failed to verify game end');
      setIsPending(false);
      throw err;
    }
  }, [address, isConnected, isCorrectNetwork, writeContractAsync, publicClient]);
  
  // Forfeit a game
  const forfeit = useCallback(async (gameAddress: string) => {
    if (!address || !isConnected) {
      throw new Error('Wallet not connected');
    }
    
    if (!isCorrectNetwork) {
      throw new Error('Please switch to MegaETH network');
    }
    
    setIsPending(true);
    
    try {
      // Write to contract
      const hash = await writeContractAsync({
        address: gameAddress as `0x${string}`,
        abi: BATTLESHIP_GAME_ABI,
        functionName: 'forfeit',
        args: [],
      });
      
      // Wait for transaction to be mined
      await publicClient?.waitForTransactionReceipt({ hash });
      
      console.log(`Game forfeited: ${gameAddress}`);
      setIsPending(false);
    } catch (err) {
      console.error('Error forfeiting game:', err);
      setError('Failed to forfeit game');
      setIsPending(false);
      throw err;
    }
  }, [address, isConnected, isCorrectNetwork, writeContractAsync, publicClient]);
  
  return {
    // Connection state
    address,
    isConnected,
    isCorrectNetwork,
    chainId,
    
    // Contract instances
    getGameContract,
    
    // Connection management
    connectWallet,
    disconnectWallet,
    switchNetwork,
    
    // Contract interactions
    createGame,
    joinGame,
    submitBoard,
    makeShot,
    submitShotResult,
    verifyGameEnd,
    forfeit,
    
    // Contract errors
    error,
    clearError,
    
    // Transaction state
    isPending: isPending || isWritePending,
  };
}