'use client';

import React, { useState } from 'react';
import { useRouter } from 'next/navigation';

// Hooks
import { useContracts } from '../hooks/useContracts';
import { backendAPI } from '../libs/api/backend-api';


// Home page component
export default function Home() {
  const router = useRouter();
  
  // Contract hooks
  const { address, isConnected, connectWallet } = useContracts();
  
  // State for invite creation
  const [isCreatingInvite, setIsCreatingInvite] = useState<boolean>(false);
  const [inviteCode, setInviteCode] = useState<string | null>(null);
  const [inviteLink, setInviteLink] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);
  
  // State for direct game joining
  const [sessionInput, setSessionInput] = useState<string>('');
  const [isJoining, setIsJoining] = useState<boolean>(false);
  
  // Handle creating a new game invitation
  const handleCreateInvite = async () => {
    if (!address) {
      setError('Please connect your wallet first');
      return;
    }
    
    setIsCreatingInvite(true);
    setError(null);
    
    try {
      // Create a new invite via backend API
      const invite = await backendAPI.createInvite(address);
      
      // Store the invite code and link
      setInviteCode(invite.code);
      setInviteLink(`${window.location.origin}/invite/${invite.code}`);
    } catch (error) {
      console.error('Error creating invite:', error);
      setError('Failed to create game invitation');
    } finally {
      setIsCreatingInvite(false);
    }
  };
  
  // Handle joining a game directly by session ID
  const handleJoinSession = async () => {
    if (!sessionInput.trim()) {
      setError('Please enter a valid session ID');
      return;
    }
    
    if (!address) {
      setError('Please connect your wallet first');
      return;
    }
    
    setIsJoining(true);
    setError(null);
    
    try {
      // Join the session
      await backendAPI.joinSession(sessionInput.trim(), address);
      
      // Navigate to the game page
      router.push(`/game/${sessionInput.trim()}`);
    } catch (error) {
      console.error('Error joining session:', error);
      setError('Failed to join game session');
      setIsJoining(false);
    }
  };
  
  // Handle copying invite link to clipboard
  const handleCopyInviteLink = async () => {
    if (!inviteLink) return;
    
    try {
      await navigator.clipboard.writeText(inviteLink);
      alert('Invite link copied to clipboard!');
    } catch (error) {
      console.error('Error copying to clipboard:', error);
      // Fallback method
      const textarea = document.createElement('textarea');
      textarea.value = inviteLink;
      document.body.appendChild(textarea);
      textarea.focus();
      textarea.select();
      document.execCommand('copy');
      document.body.removeChild(textarea);
      alert('Invite link copied to clipboard!');
    }
  };
  
  return (
    <div className="container mx-auto px-4 py-16 max-w-4xl">
      <div className="text-center mb-16">
        <h1 className="text-5xl font-bold mb-6">ZK Battleship</h1>
        <p className="text-xl text-gray-600 mb-8">
          A zero-knowledge proof battleship game on MegaETH - Sink your opponent&apos;s ships while keeping yours hidden with cryptographic proofs!
        </p>
        
        {/* Wallet connection section */}
        <div className="mb-12">
          {!isConnected ? (
            <button
              className="bg-blue-500 hover:bg-blue-600 text-white py-3 px-8 rounded-lg text-lg"
              onClick={connectWallet}
            >
              Connect Wallet to Play
            </button>
          ) : (
            <div className="mb-6">
              <div className="inline-block bg-green-100 border border-green-300 rounded-lg py-2 px-4">
                <p className="text-green-800">
                  <span className="font-medium">Connected:</span>{' '}
                  <code className="bg-white px-2 py-1 rounded text-sm">{address}</code>
                </p>
              </div>
            </div>
          )}
        </div>
      </div>

      {/* Game options section */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-8 mb-16">
        {/* Create game card */}
        <div className="bg-white rounded-lg shadow-md p-6 border border-gray-200">
          <h2 className="text-2xl font-bold mb-4">Create a New Game</h2>
          <p className="text-gray-600 mb-6">
            Start a new Battleship game and invite a friend to play with you.
          </p>
          
          {inviteCode ? (
            <div className="mb-6">
              <div className="bg-green-50 border-l-4 border-green-500 p-4 mb-4">
                <p className="font-medium text-green-700">Game invitation created!</p>
                <p className="text-green-600">Share this link with your opponent:</p>
              </div>
              
              <div className="bg-gray-100 p-3 rounded flex items-center justify-between mb-4">
                <code className="text-sm truncate mr-2">{inviteLink}</code>
                <button
                  className="bg-gray-200 hover:bg-gray-300 text-gray-800 py-1 px-3 rounded"
                  onClick={handleCopyInviteLink}
                >
                  Copy
                </button>
              </div>
              
              <div className="flex flex-col gap-3">
                <button
                  className="bg-blue-500 hover:bg-blue-600 text-white py-2 px-4 rounded"
                  onClick={() => {
                    if (inviteLink) {
                      const parts = inviteLink.split('/');
                      const sessionId = parts[parts.length - 1];
                      router.push(`/game/${sessionId}`);
                    }
                  }}
                >
                  Go to Game
                </button>
                
                <button
                  className="bg-gray-500 hover:bg-gray-600 text-white py-2 px-4 rounded"
                  onClick={() => {
                    setInviteCode(null);
                    setInviteLink(null);
                  }}
                >
                  Create Another Game
                </button>
              </div>
            </div>
          ) : (
            <button
              className={`w-full py-3 px-6 rounded-lg ${
                isCreatingInvite || !isConnected
                  ? 'bg-gray-400 cursor-not-allowed'
                  : 'bg-green-500 hover:bg-green-600'
              } text-white`}
              onClick={handleCreateInvite}
              disabled={isCreatingInvite || !isConnected}
            >
              {isCreatingInvite ? (
                <span className="flex items-center justify-center">
                  <svg className="animate-spin -ml-1 mr-3 h-5 w-5 text-white" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24">
                    <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
                    <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
                  </svg>
                  Creating Game...
                </span>
              ) : (
                'Create New Game'
              )}
            </button>
          )}
        </div>
        
        {/* Join game card */}
        <div className="bg-white rounded-lg shadow-md p-6 border border-gray-200">
          <h2 className="text-2xl font-bold mb-4">Join a Game</h2>
          <p className="text-gray-600 mb-6">
            Enter a session ID or use an invite link to join an existing game.
          </p>
          
          <div className="mb-4">
            <label htmlFor="sessionId" className="block text-gray-700 mb-2">
              Session ID
            </label>
            <input
              type="text"
              id="sessionId"
              className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
              placeholder="Enter session ID"
              value={sessionInput}
              onChange={(e) => setSessionInput(e.target.value)}
            />
          </div>
          
          <button
            className={`w-full py-3 px-6 rounded-lg mb-4 ${
              isJoining || !isConnected || !sessionInput.trim()
                ? 'bg-gray-400 cursor-not-allowed'
                : 'bg-blue-500 hover:bg-blue-600'
            } text-white`}
            onClick={handleJoinSession}
            disabled={isJoining || !isConnected || !sessionInput.trim()}
          >
            {isJoining ? (
              <span className="flex items-center justify-center">
                <svg className="animate-spin -ml-1 mr-3 h-5 w-5 text-white" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24">
                  <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
                  <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
                </svg>
                Joining Game...
              </span>
            ) : (
              'Join Game'
            )}
          </button>
          
          <div className="text-center">
            <span className="text-gray-500">or</span>
          </div>
          
          <div className="mt-4 text-center">
            <p className="mb-2">Have an invite link?</p>
            <p className="text-sm text-gray-600">
              Simply open the invite link directly to join the game
            </p>
          </div>
        </div>
      </div>
      
      {/* Error display */}
      {error && (
        <div className="bg-red-100 border-l-4 border-red-500 text-red-700 p-4 mb-8" role="alert">
          <p className="font-bold">Error</p>
          <p>{error}</p>
        </div>
      )}
      
      {/* How to play section */}
      <div className="bg-white rounded-lg shadow-md p-6 border border-gray-200 mb-16">
        <h2 className="text-2xl font-bold mb-4">How to Play</h2>
        
        <div className="space-y-4">
          <div>
            <h3 className="text-lg font-semibold">1. Setup Game</h3>
            <p>Create a new game and invite your opponent or join an existing game.</p>
          </div>
          
          <div>
            <h3 className="text-lg font-semibold">2. Place Your Ships</h3>
            <p>Place your ships on the board. You have 5 ships of different sizes.</p>
          </div>
          
          <div>
            <h3 className="text-lg font-semibold">3. Make Your Shots</h3>
            <p>Take turns firing at your opponent&apos;s board. The goal is to sink all enemy ships.</p>
          </div>
          
          <div>
            <h3 className="text-lg font-semibold">4. Zero-Knowledge Proofs</h3>
            <p>Your ship positions remain private. Cryptographic proofs verify your moves without revealing your board.</p>
          </div>
        </div>
      </div>
      
      {/* Technical info section */}
      <div className="bg-gray-100 rounded-lg p-6">
        <h2 className="text-lg font-semibold mb-3">Technical Information</h2>
        
        <div className="space-y-2 text-sm text-gray-600">
          <p>
            Network: <span className="font-medium">MegaETH Testnet</span>
          </p>
          <p>
            Game Factory: <code className="bg-white px-2 py-1 rounded">{process.env.NEXT_PUBLIC_GAME_FACTORY_ADDRESS || '0x75d67fc7a0d77128416d2D55b00c857e780999d7'}</code>
          </p>
          <p>
            ZK Verifier: <code className="bg-white px-2 py-1 rounded">{process.env.NEXT_PUBLIC_ZK_VERIFIER_ADDRESS || '0xf463Fc86FfC9eea4e4eF43632D7642a9d45Ba775'}</code>
          </p>
          <p className="mt-4">
            Built with Next.js, Tailwind CSS, Noir for ZK Proofs, and Cloudflare for backend.
          </p>
        </div>
      </div>
    </div>
  );
}