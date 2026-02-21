'use client';

import React, { createContext, useContext, useState, useCallback, useRef } from 'react';

// eslint-disable-next-line @typescript-eslint/no-explicit-any
type LucidInstance = any;

interface WalletContextType {
	lucid: LucidInstance | null;
	walletAddress: string | null;
	isConnecting: boolean;
	isConnected: boolean;
	connectWallet: (walletName?: string) => Promise<void>;
	disconnectWallet: () => void;
	error: string | null;
}

const WalletContext = createContext<WalletContextType | undefined>(undefined);

export function WalletProvider({ children }: { children: React.ReactNode }) {
	const [lucid, setLucid] = useState<LucidInstance | null>(null);
	const [walletAddress, setWalletAddress] = useState<string | null>(null);
	const [isConnecting, setIsConnecting] = useState(false);
	const [error, setError] = useState<string | null>(null);
	const connectingRef = useRef(false);

	const connectWallet = useCallback(async (walletName: string = 'lace') => {
		if (connectingRef.current) return;
		connectingRef.current = true;

		try {
			setIsConnecting(true);
			setError(null);

			const { initLucid } = await import('@/lib/lucid');
			const lucidInstance = await initLucid();

			// eslint-disable-next-line @typescript-eslint/no-explicit-any
			const cardano = (window as any).cardano;
			if (!cardano || !cardano[walletName]) {
				throw new Error(
					`${walletName.charAt(0).toUpperCase() + walletName.slice(1)} wallet not found. ` +
						`Please install the ${walletName} browser extension.`,
				);
			}

			const walletApi = await cardano[walletName].enable();

			lucidInstance.selectWallet.fromAPI(walletApi);

			const address = await lucidInstance.wallet().address();

			setLucid(lucidInstance);
			setWalletAddress(address);
		} catch (err) {
			const errorMessage = err instanceof Error ? err.message : 'Failed to connect wallet';
			setError(errorMessage);
			console.error('Wallet connection error:', err);
		} finally {
			setIsConnecting(false);
			connectingRef.current = false;
		}
	}, []);

	const disconnectWallet = useCallback(() => {
		setLucid(null);
		setWalletAddress(null);
		setError(null);
	}, []);

	return (
		<WalletContext.Provider
			value={{
				lucid,
				walletAddress,
				isConnecting,
				isConnected: !!walletAddress,
				connectWallet,
				disconnectWallet,
				error,
			}}>
			{children}
		</WalletContext.Provider>
	);
}

export function useWallet() {
	const context = useContext(WalletContext);
	if (context === undefined) {
		throw new Error('useWallet must be used within a WalletProvider');
	}
	return context;
}
