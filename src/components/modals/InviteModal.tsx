import React, { useState, useEffect, useRef } from 'react';
import { backendAPI } from '../../libs/api/backend-api';

// Props for InviteModal component
interface InviteModalProps {
  isOpen: boolean;
  onClose: () => void;
  playerAddress: string;
  onInviteCreated?: (inviteLink: string, sessionId: string) => void;
}

// Invite modal component
const InviteModal: React.FC<InviteModalProps> = ({
  isOpen,
  onClose,
  playerAddress,
  onInviteCreated
}) => {
  // State
  const [isCreating, setIsCreating] = useState<boolean>(false);
  const [inviteLink, setInviteLink] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [copySuccess, setCopySuccess] = useState<boolean>(false);
  
  // Refs
  const modalRef = useRef<HTMLDivElement>(null);
  const inviteLinkInputRef = useRef<HTMLInputElement>(null);
  
  // Handle creating an invite
  const handleCreateInvite = async () => {
    if (!playerAddress) {
      setError('Wallet not connected');
      return;
    }
    
    setIsCreating(true);
    setError(null);
    
    try {
      // Create a new invite via backend API
      const invite = await backendAPI.createInvite(playerAddress);
      
      // Format invite link
      const link = `${typeof window !== 'undefined' ? window.location.origin : ''}/invite/${invite.code}`;
      
      // Store the invite link
      setInviteLink(link);
      
      // Call the callback if provided
      if (onInviteCreated) {
        onInviteCreated(link, invite.id);
      }
    } catch (error) {
      console.error('Error creating invite:', error);
      setError('Failed to create game invitation');
    } finally {
      setIsCreating(false);
    }
  };
  
  // Handle copying invite link to clipboard
  const handleCopyInviteLink = async () => {
    if (!inviteLink) return;
    
    try {
      await navigator.clipboard.writeText(inviteLink);
      setCopySuccess(true);
      
      // Reset copy success after 3 seconds
      setTimeout(() => {
        setCopySuccess(false);
      }, 3000);
    } catch (error) {
      console.error('Error copying to clipboard:', error);
      // Fallback method
      if (inviteLinkInputRef.current) {
        inviteLinkInputRef.current.select();
        document.execCommand('copy');
        setCopySuccess(true);
        
        // Reset copy success after 3 seconds
        setTimeout(() => {
          setCopySuccess(false);
        }, 3000);
      }
    }
  };
  
  // Handle clicking outside the modal to close it
  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      if (modalRef.current && !modalRef.current.contains(event.target as Node)) {
        onClose();
      }
    };
    
    // Add event listener when modal is open
    if (isOpen) {
      document.addEventListener('mousedown', handleClickOutside);
    }
    
    // Clean up event listener
    return () => {
      document.removeEventListener('mousedown', handleClickOutside);
    };
  }, [isOpen, onClose]);
  
  // Handle escape key press to close modal
  useEffect(() => {
    const handleEscapeKey = (event: KeyboardEvent) => {
      if (event.key === 'Escape') {
        onClose();
      }
    };
    
    // Add event listener when modal is open
    if (isOpen) {
      document.addEventListener('keydown', handleEscapeKey);
    }
    
    // Clean up event listener
    return () => {
      document.removeEventListener('keydown', handleEscapeKey);
    };
  }, [isOpen, onClose]);
  
  // Handle creating invite automatically when modal opens
  useEffect(() => {
    if (isOpen && !inviteLink && !isCreating) {
      handleCreateInvite();
    }
  }, [isOpen, inviteLink, isCreating]);
  
  // Reset state when modal closes
  useEffect(() => {
    if (!isOpen) {
      setInviteLink(null);
      setError(null);
      setCopySuccess(false);
    }
  }, [isOpen]);
  
  // If the modal is not open, don't render anything
  if (!isOpen) {
    return null;
  }
  
  return (
    <div className="fixed inset-0 bg-black bg-opacity-50 z-50 flex items-center justify-center">
      <div
        ref={modalRef}
        className="bg-white rounded-lg shadow-xl max-w-md w-full p-6 m-4"
      >
        <h2 className="text-2xl font-bold mb-4">Invite a Friend</h2>
        
        {error ? (
          <div className="mb-4 bg-red-100 border-l-4 border-red-500 text-red-700 p-4">
            <p className="font-bold">Error</p>
            <p>{error}</p>
            
            <button
              className="mt-3 bg-red-500 hover:bg-red-600 text-white py-2 px-4 rounded"
              onClick={handleCreateInvite}
            >
              Try Again
            </button>
          </div>
        ) : isCreating ? (
          <div className="mb-4 text-center py-6">
            <div className="animate-spin h-12 w-12 border-4 border-blue-500 border-t-transparent rounded-full mx-auto mb-4"></div>
            <p className="text-gray-600">Creating invitation link...</p>
          </div>
        ) : inviteLink ? (
          <div className="mb-4">
            <p className="mb-2 text-gray-700">
              Share this link with your friend to invite them to play:
            </p>
            
            <div className="flex mb-2">
              <input
                ref={inviteLinkInputRef}
                type="text"
                className="flex-grow px-3 py-2 border border-gray-300 rounded-l-md bg-gray-50 focus:outline-none"
                value={inviteLink}
                readOnly
              />
              <button
                className={`px-4 py-2 ${
                  copySuccess 
                    ? 'bg-green-500 hover:bg-green-600' 
                    : 'bg-blue-500 hover:bg-blue-600'
                } text-white rounded-r-md`}
                onClick={handleCopyInviteLink}
              >
                {copySuccess ? 'Copied!' : 'Copy'}
              </button>
            </div>
            
            <div className="mt-4 text-center">
              <p className="text-sm text-gray-500 mb-2">Or share via:</p>
              
              <div className="flex justify-center space-x-4">
                {/* Social share buttons */}
                <a
                  href={`https://twitter.com/intent/tweet?text=Play ZK Battleship with me!&url=${encodeURIComponent(inviteLink)}`}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="bg-blue-400 hover:bg-blue-500 text-white p-2 rounded-full"
                >
                  Twitter
                </a>
                
                <a
                  href={`https://t.me/share/url?url=${encodeURIComponent(inviteLink)}&text=Play ZK Battleship with me!`}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="bg-blue-500 hover:bg-blue-600 text-white p-2 rounded-full"
                >
                  Telegram
                </a>
                
                <a
                  href={`mailto:?subject=Join me for a game of ZK Battleship&body=I've invited you to play ZK Battleship! Join here: ${encodeURIComponent(inviteLink)}`}
                  className="bg-gray-500 hover:bg-gray-600 text-white p-2 rounded-full"
                >
                  Email
                </a>
              </div>
            </div>
          </div>
        ) : null}
        
        <div className="flex justify-end mt-6">
          <button
            className="bg-gray-300 hover:bg-gray-400 text-gray-800 py-2 px-4 rounded"
            onClick={onClose}
          >
            Close
          </button>
        </div>
      </div>
    </div>
  );
};

export default InviteModal;