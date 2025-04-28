import React, { useState, useEffect, useRef } from 'react';

// Chat message interface
interface ChatMessage {
  sender: string;
  text: string;
  timestamp: number;
  isSystem?: boolean;
}

// Props for GameChat component
interface GameChatProps {
  messages: ChatMessage[];
  playerAddress: string;
  opponentAddress: string | null;
  onSendMessage: (text: string) => void;
  isExpanded?: boolean;
  onToggleExpand?: () => void;
}

// Game chat component
const GameChat: React.FC<GameChatProps> = ({
  messages,
  playerAddress,
  opponentAddress,
  onSendMessage,
  isExpanded = true,
  onToggleExpand
}) => {
  // State
  const [messageInput, setMessageInput] = useState<string>('');
  
  // Refs
  const messagesEndRef = useRef<HTMLDivElement>(null);
  const chatContainerRef = useRef<HTMLDivElement>(null);
  
  // Format address for display
  const formatAddress = (address: string) => {
    return `${address.slice(0, 4)}...${address.slice(-4)}`;
  };
  
  // Handle sending a message
  const handleSendMessage = (e: React.FormEvent) => {
    e.preventDefault();
    
    if (messageInput.trim()) {
      onSendMessage(messageInput.trim());
      setMessageInput('');
    }
  };
  
  // Scroll to bottom of chat when new messages arrive
  useEffect(() => {
    if (messagesEndRef.current) {
      messagesEndRef.current.scrollIntoView({ behavior: 'smooth' });
    }
  }, [messages]);
  
  // If chat is collapsed, only show a button to expand it
  if (!isExpanded) {
    return (
      <button
        className="fixed bottom-4 right-4 bg-blue-500 hover:bg-blue-600 text-white p-3 rounded-full shadow-lg"
        onClick={onToggleExpand}
      >
        <span className="sr-only">Open chat</span>
        <svg xmlns="http://www.w3.org/2000/svg" className="h-6 w-6" fill="none" viewBox="0 0 24 24" stroke="currentColor">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8 12h.01M12 12h.01M16 12h.01M21 12c0 4.418-4.03 8-9 8a9.863 9.863 0 01-4.255-.949L3 20l1.395-3.72C3.512 15.042 3 13.574 3 12c0-4.418 4.03-8 9-8s9 3.582 9 8z" />
        </svg>
        {messages.length > 0 && (
          <span className="absolute -top-1 -right-1 bg-red-500 text-white text-xs rounded-full h-5 w-5 flex items-center justify-center">
            {messages.length}
          </span>
        )}
      </button>
    );
  }
  
  return (
    <div 
      ref={chatContainerRef}
      className="bg-white rounded-lg shadow-md flex flex-col h-80 max-h-full"
    >
      <div className="flex items-center justify-between p-3 border-b">
        <h3 className="font-semibold">Game Chat</h3>
        {onToggleExpand && (
          <button
            className="text-gray-500 hover:text-gray-700"
            onClick={onToggleExpand}
          >
            <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
            </svg>
          </button>
        )}
      </div>
      
      <div className="flex-1 p-3 overflow-y-auto bg-gray-50">
        {messages.length === 0 ? (
          <div className="text-center text-gray-500 mt-6">
            <p>No messages yet</p>
            <p className="text-sm mt-1">Be the first to say hello!</p>
          </div>
        ) : (
          <div className="space-y-2">
            {messages.map((message, index) => (
              <div 
                key={index}
                className={`p-2 rounded-lg max-w-xs ${
                  message.isSystem
                    ? 'bg-gray-200 text-gray-700 mx-auto text-center text-sm'
                    : message.sender === playerAddress
                    ? 'bg-blue-500 text-white ml-auto'
                    : 'bg-gray-300 text-gray-800'
                }`}
              >
                {!message.isSystem && (
                  <div className="font-medium text-xs mb-1">
                    {message.sender === playerAddress
                      ? 'You'
                      : opponentAddress && message.sender === opponentAddress
                      ? 'Opponent'
                      : formatAddress(message.sender)
                    }
                  </div>
                )}
                <div>{message.text}</div>
                <div className="text-xs opacity-75 text-right mt-1">
                  {new Date(message.timestamp).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                </div>
              </div>
            ))}
            <div ref={messagesEndRef} />
          </div>
        )}
      </div>
      
      <form onSubmit={handleSendMessage} className="p-2 border-t flex">
        <input
          type="text"
          placeholder="Type a message..."
          className="flex-1 px-3 py-2 border border-gray-300 rounded-l-md focus:outline-none focus:ring-1 focus:ring-blue-500"
          value={messageInput}
          onChange={(e) => setMessageInput(e.target.value)}
        />
        <button
          type="submit"
          className="bg-blue-500 hover:bg-blue-600 text-white px-4 py-2 rounded-r-md"
          disabled={!messageInput.trim()}
        >
          Send
        </button>
      </form>
    </div>
  );
};

export default GameChat;