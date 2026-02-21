'use client';

import React from 'react';
import { useWallet } from '@/context/WalletContext';
import { X, Loader2 } from 'lucide-react';

export function WalletConnect() {
	const { walletAddress, isConnecting, isConnected, connectWallet, disconnectWallet, error } = useWallet();

	if (isConnected && walletAddress) {
		return (
			<div className="flex items-center gap-3">
				<div className="flex items-center gap-2 px-4 py-2 rounded-xl bg-bg-surface border border-border">
					<span className="w-2 h-2 rounded-full bg-success" />
					<span className="text-sm font-mono text-ivory-dim">
						{walletAddress.slice(0, 10)}...{walletAddress.slice(-6)}
					</span>
				</div>

				<button onClick={disconnectWallet} className="btn-outline px-4 py-2">
					<X className="w-4 h-4" />
				</button>
			</div>
		);
	}

	return (
		<div className="flex flex-col items-end gap-2">
			<button onClick={() => connectWallet('lace')} disabled={isConnecting} className="btn-gold">
				{isConnecting ? (
					<span className="flex items-center gap-2">
						<Loader2 className="w-4 h-4 animate-spin" />
						Connecting...
					</span>
				) : (
					'Connect Lace'
				)}
			</button>

			{error && <p className="text-xs text-error">{error}</p>}
		</div>
	);
}
