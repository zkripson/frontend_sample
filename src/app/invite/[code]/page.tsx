/* eslint-disable @typescript-eslint/no-explicit-any */
'use client';

import React, { useState, useEffect } from 'react';
import { useParams, useRouter } from 'next/navigation';
import Link from 'next/link';

// API and hooks
import { backendAPI } from '../../../libs/api/backend-api';
import { useContracts } from '../../../hooks/useContracts';

// Invite page component for accepting game invitations
export default function InvitePage() {
  // Get invite code from URL
  const { code } = useParams<{ code: string }>();
  const router = useRouter();
  
  // Contract hooks for wallet connection
  const { address, isConnected, connectWallet } = useContracts();
  
  // State for invite details
  const [inviteDetails, setInviteDetails] = useState<any>(null);
  const [isLoading, setIsLoading] = useState<boolean>(true);
  const [error, setError] = useState<string | null>(null);
  const [isAccepting, setIsAccepting] = useState<boolean>(false);
  const [acceptedSessionId, setAcceptedSessionId] = useState<string | null>(null);
  
  // Load invite details
  useEffect(() => {
    const loadInviteDetails = async () => {
      try {
        const invite = await backendAPI.getInviteByCode(code as string);
        setInviteDetails(invite);
      } catch (error) {
        setError('Failed to load invitation details');
        console.error('Error loading invite:', error);
      } finally {
        setIsLoading(false);
      }
    };
    
    if (code) {
      loadInviteDetails();
    }
  }, [code]);
  
  // Handle accepting invite
  const handleAcceptInvite = async () => {
    if (!address || !inviteDetails) return;
    
    setIsAccepting(true);
    
    try {
      // Accept invite via backend API
      const result = await backendAPI.acceptInvite(code as string, address);
      
      // Store the session ID
      setAcceptedSessionId(result.sessionId);
      
      // Navigate to the game page
      router.push(`/game/${result.sessionId}`);
    } catch (error) {
      setError('Failed to accept invitation');
      console.error('Error accepting invite:', error);
      setIsAccepting(false);
    }
  };
  
  // Determine if invite is valid and can be accepted
  const canAcceptInvite = inviteDetails && 
    inviteDetails.status === 'pending' && 
    inviteDetails.expiresAt > Date.now() &&
    address && 
    inviteDetails.creator.toLowerCase() !== address.toLowerCase();
  
  // Render error message if invite loading failed
  if (error) {
    return (
      <div className="container mx-auto px-4 py-16 max-w-lg text-center">
        <h1 className="text-3xl font-bold mb-4">ZK Battleship</h1>
        <div className="bg-red-100 border-l-4 border-red-500 text-red-700 p-4 mb-6" role="alert">
          <p className="font-bold">Error</p>
          <p>{error}</p>
        </div>
        <Link href="/" className="text-blue-500 hover:underline">
          Return to Home
        </Link>
      </div>
    );
  }
  
  // Render loading state
  if (isLoading) {
    return (
      <div className="container mx-auto px-4 py-16 max-w-lg text-center">
        <h1 className="text-3xl font-bold mb-4">ZK Battleship</h1>
        <div className="animate-spin h-10 w-10 border-4 border-blue-500 border-t-transparent rounded-full mx-auto mb-4"></div>
        <p>Loading invitation details...</p>
      </div>
    );
  }
  
  // Render expired invite message
  if (inviteDetails && inviteDetails.status === 'expired') {
    return (
      <div className="container mx-auto px-4 py-16 max-w-lg text-center">
        <h1 className="text-3xl font-bold mb-4">ZK Battleship</h1>
        <div className="bg-yellow-100 border-l-4 border-yellow-500 text-yellow-700 p-4 mb-6" role="alert">
          <p className="font-bold">Invitation Expired</p>
          <p>This game invitation has expired.</p>
        </div>
        <Link href="/" className="text-blue-500 hover:underline">
          Return to Home
        </Link>
      </div>
    );
  }
  
  // Render already accepted invite
  if (inviteDetails && inviteDetails.status === 'accepted') {
    return (
      <div className="container mx-auto px-4 py-16 max-w-lg text-center">
        <h1 className="text-3xl font-bold mb-4">ZK Battleship</h1>
        <div className="bg-green-100 border-l-4 border-green-500 text-green-700 p-4 mb-6" role="alert">
          <p className="font-bold">Invitation Already Accepted</p>
          <p>This game has already started.</p>
        </div>
        {inviteDetails.sessionId && (
          <div className="mb-4">
            <Link 
              href={`/game/${inviteDetails.sessionId}`}
              className="bg-blue-500 hover:bg-blue-600 text-white py-2 px-4 rounded inline-block"
            >
              Join Game
            </Link>
          </div>
        )}
        <Link href="/" className="text-blue-500 hover:underline">
          Return to Home
        </Link>
      </div>
    );
  }
  
  // Render canceled invite
  if (inviteDetails && inviteDetails.status === 'canceled') {
    return (
      <div className="container mx-auto px-4 py-16 max-w-lg text-center">
        <h1 className="text-3xl font-bold mb-4">ZK Battleship</h1>
        <div className="bg-red-100 border-l-4 border-red-500 text-red-700 p-4 mb-6" role="alert">
          <p className="font-bold">Invitation Canceled</p>
          <p>This game invitation has been canceled by the creator.</p>
        </div>
        <Link href="/" className="text-blue-500 hover:underline">
          Return to Home
        </Link>
      </div>
    );
  }
  
  // Main invite view for accepting
  return (
    <div className="container mx-auto px-4 py-16 max-w-lg">
      <h1 className="text-3xl font-bold mb-4 text-center">ZK Battleship</h1>
      
      <div className="bg-white p-6 rounded-lg shadow-md">
        <h2 className="text-2xl font-semibold mb-4">Game Invitation</h2>
        
        {inviteDetails && (
          <div className="mb-6">
            <p className="mb-2">
              <span className="font-medium">From:</span>{' '}
              <code className="bg-gray-100 px-2 py-1 rounded">{inviteDetails.creator}</code>
            </p>
            <p className="mb-4">
              <span className="font-medium">Expires:</span>{' '}
              {new Date(inviteDetails.expiresAt).toLocaleString()}
            </p>
            
            <div className="border-t border-gray-200 pt-4">
              <p className="text-lg font-medium mb-3">You&apos;ve been invited to play ZK Battleship!</p>
              <p className="text-gray-600 mb-4">
                This is a zero-knowledge proof-based version of the classic Battleship game.
                Your ship positions remain private and are verified with cryptographic proofs.
              </p>
            </div>
          </div>
        )}
        
        {!isConnected ? (
          <div className="mb-4">
            <p className="mb-4">Please connect your wallet to accept this invitation.</p>
            <button
              className="bg-blue-500 hover:bg-blue-600 text-white py-2 px-6 rounded w-full"
              onClick={connectWallet}
            >
              Connect Wallet
            </button>
          </div>
        ) : (
          <div className="mb-4">
            <p className="mb-2">
              <span className="font-medium">Connected as:</span>{' '}
              <code className="bg-gray-100 px-2 py-1 rounded">{address}</code>
            </p>
            
            {canAcceptInvite ? (
              <button
                className={`w-full py-3 px-6 rounded-lg mt-4 ${
                  isAccepting
                    ? 'bg-gray-400 cursor-not-allowed'
                    : 'bg-green-500 hover:bg-green-600'
                } text-white`}
                onClick={handleAcceptInvite}
                disabled={isAccepting}
              >
                {isAccepting ? (
                  <span className="flex items-center justify-center">
                    <svg className="animate-spin -ml-1 mr-3 h-5 w-5 text-white" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24">
                      <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
                      <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
                    </svg>
                    Accepting Invitation...
                  </span>
                ) : (
                  'Accept Invitation & Play Now'
                )}
              </button>
            ) : (
              <div className="bg-yellow-100 border-l-4 border-yellow-500 text-yellow-700 p-4 mt-4" role="alert">
                {inviteDetails && inviteDetails.creator.toLowerCase() === address?.toLowerCase() ? (
                  <p>You cannot accept your own invitation. Share this link with someone else.</p>
                ) : (
                  <p>This invitation cannot be accepted with your current wallet.</p>
                )}
              </div>
            )}
          </div>
        )}
        
        {/* Redirect to game if accepted */}
        {acceptedSessionId && (
          <div className="text-center mt-4">
            <p className="text-green-600 mb-2">Invitation accepted!</p>
            <p>Redirecting to game...</p>
          </div>
        )}
        
        <div className="mt-6 text-center">
          <Link href="/" className="text-blue-500 hover:underline">
            Return to Home
          </Link>
        </div>
      </div>
    </div>
  );
}