'use client';

import React from 'react';
import Link from 'next/link';
import { usePathname } from 'next/navigation';
import { useContracts } from '../../hooks/useContracts';

const Navbar: React.FC = () => {
  const pathname = usePathname();
  const { address, isConnected, connectWallet, isCorrectNetwork, switchNetwork } = useContracts();
  
  // Truncate address for display
  const truncateAddress = (address: string) => {
    return `${address.slice(0, 6)}...${address.slice(-4)}`;
  };
  
  // Format address for display
  const displayAccount = address ? truncateAddress(address) : '';
  
  return (
    <nav className="bg-white shadow-md py-4">
      <div className="container mx-auto px-4 flex justify-between items-center">
        <div className="flex items-center">
          <Link href="/" className="text-xl font-bold text-blue-600">
            ZK Battleship
          </Link>
          
          <div className="hidden md:flex ml-8 space-x-6">
            <NavLink href="/" active={pathname === '/'}>
              Home
            </NavLink>
            
            {isConnected && (
              <>
                <NavLink href="/my-games" active={pathname.startsWith('/my-games')}>
                  My Games
                </NavLink>
                <NavLink href="/create" active={pathname === '/create'}>
                  New Game
                </NavLink>
              </>
            )}
            
            <NavLink href="/how-to-play" active={pathname === '/how-to-play'}>
              How to Play
            </NavLink>
          </div>
        </div>
        
        <div className="flex items-center">
          {isConnected ? (
            <div className="flex items-center">
              {!isCorrectNetwork && (
                <button
                  onClick={switchNetwork}
                  className="mr-4 py-2 px-4 rounded bg-yellow-500 hover:bg-yellow-600 text-white"
                >
                  Switch to MegaETH
                </button>
              )}
              
              <div className="bg-gray-100 py-2 px-4 rounded-lg flex items-center">
                <div className="h-2 w-2 rounded-full bg-green-500 mr-2" />
                <span className="text-gray-800">{displayAccount}</span>
              </div>
            </div>
          ) : (
            <button
              onClick={connectWallet}
              className="py-2 px-4 rounded bg-blue-500 hover:bg-blue-600 text-white"
            >
              Connect Wallet
            </button>
          )}
        </div>
      </div>
    </nav>
  );
};

// NavLink component for consistent styling
interface NavLinkProps {
  href: string;
  active: boolean;
  children: React.ReactNode;
}

const NavLink: React.FC<NavLinkProps> = ({ href, active, children }) => {
  return (
    <Link
      href={href}
      className={`text-gray-700 hover:text-blue-600 transition-colors ${
        active ? 'font-semibold text-blue-600' : ''
      }`}
    >
      {children}
    </Link>
  );
};

export default Navbar;