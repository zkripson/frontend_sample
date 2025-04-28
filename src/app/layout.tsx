import './globals.css';
import Navbar from '../components/nav/Navbar';
import type { Metadata } from 'next';
import { megaethTestnet } from 'viem/chains';
import { createConfig, http, WagmiProvider } from 'wagmi';
import { MEGAETH_CONFIG } from '@/libs/contracts/config';


export const metadata: Metadata = {
  title: 'ZK Battleship',
  description: 'Zero-knowledge battleship game on MegaETH',
};

export const config = createConfig({
  chains: [megaethTestnet],
  transports: {
    [megaethTestnet.id]: http(MEGAETH_CONFIG.rpcUrl),
  },
})

export default function RootLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <html lang="en">
      <body className="min-h-screen bg-gray-50">
        <WagmiProvider config={config}>
          <Navbar />
          <main className="pb-12">
            {children}
          </main>
          <footer className="border-t border-gray-200 bg-white py-4 text-center text-gray-600 text-sm">
            <div className="container mx-auto">
              <p>ZK Battleship on MegaETH © 2025</p>
              <p className="mt-1">Built with Zero-Knowledge Proofs to keep your strategy private</p>
            </div>
          </footer>
        </WagmiProvider>
      </body>
    </html>
  );
}