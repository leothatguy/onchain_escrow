'use client';

import React, { useState, useEffect, useCallback } from 'react';
import { useWallet } from '@/context/WalletContext';
import { getEscrowUtxos, decodeDatum, releaseFunds, refundFunds } from '@/lib/escrow';
import { paymentCredentialOf, type UTxO } from '@lucid-evolution/lucid';
import { Link as LinkIcon, Inbox, ClockAlert, Hourglass, Check, RotateCcw, RefreshCw } from 'lucide-react';

interface DecodedEscrow {
	utxo: UTxO;
	payer: string;
	payee: string;
	deadline: number;
	amount: number;
	lovelaceOnUtxo: bigint;
}

export function EscrowList() {
	const { lucid, walletAddress, isConnected } = useWallet();
	const [escrows, setEscrows] = useState<DecodedEscrow[]>([]);
	const [loading, setLoading] = useState(false);
	const [error, setError] = useState<string | null>(null);
	const [actionLoading, setActionLoading] = useState<string | null>(null);
	const [actionResult, setActionResult] = useState<{
		type: 'success' | 'error';
		message: string;
	} | null>(null);

	const loadEscrows = useCallback(async () => {
		if (!lucid || !isConnected) return;

		try {
			setLoading(true);
			setError(null);

			const utxos = await getEscrowUtxos(lucid);

			const decoded: DecodedEscrow[] = [];
			for (const utxo of utxos) {
				if (!utxo.datum) continue;

				const datum = decodeDatum(utxo.datum);
				if (!datum) continue;

				decoded.push({
					utxo,
					payer: datum.payer,
					payee: datum.payee,
					deadline: datum.deadline,
					amount: datum.amount,
					lovelaceOnUtxo: utxo.assets['lovelace'] || BigInt(0),
				});
			}

			setEscrows(decoded);
		} catch (err) {
			const msg = err instanceof Error ? err.message : 'Failed to load escrows';
			setError(msg);
			console.error('Load escrows error:', err);
		} finally {
			setLoading(false);
		}
	}, [lucid, isConnected]);

	useEffect(() => {
		loadEscrows();
	}, [loadEscrows]);

	const handleRelease = async (escrow: DecodedEscrow) => {
		if (!lucid) return;
		const key = `${escrow.utxo.txHash}-${escrow.utxo.outputIndex}`;
		try {
			setActionLoading(key);
			setActionResult(null);

			const txHash = await releaseFunds(lucid, escrow.utxo);
			setActionResult({
				type: 'success',
				message: `Released! Tx: ${txHash.slice(0, 20)}...`,
			});

			setTimeout(loadEscrows, 3000);
		} catch (err) {
			const msg = err instanceof Error ? err.message : 'Failed to release funds';
			setActionResult({ type: 'error', message: msg });
		} finally {
			setActionLoading(null);
		}
	};

	const handleRefund = async (escrow: DecodedEscrow) => {
		if (!lucid) return;
		const key = `${escrow.utxo.txHash}-${escrow.utxo.outputIndex}`;
		try {
			setActionLoading(key);
			setActionResult(null);

			const txHash = await refundFunds(lucid, escrow.utxo);
			setActionResult({
				type: 'success',
				message: `Refunded! Tx: ${txHash.slice(0, 20)}...`,
			});
			setTimeout(loadEscrows, 3000);
		} catch (err) {
			const msg = err instanceof Error ? err.message : 'Failed to refund funds';
			setActionResult({ type: 'error', message: msg });
		} finally {
			setActionLoading(null);
		}
	};

	const formatAda = (lovelace: number) => (lovelace / 1_000_000).toFixed(2);

	const formatDeadline = (timestamp: number) => {
		const date = new Date(timestamp);
		return date.toLocaleString(undefined, {
			month: 'short',
			day: 'numeric',
			year: 'numeric',
			hour: '2-digit',
			minute: '2-digit',
		});
	};

	const isExpired = (deadline: number) => Date.now() >= deadline;

	const timeRemaining = (deadline: number) => {
		const diff = deadline - Date.now();
		if (diff <= 0) return 'Expired';
		const hours = Math.floor(diff / (1000 * 60 * 60));
		const mins = Math.floor((diff % (1000 * 60 * 60)) / (1000 * 60));
		if (hours > 24) return `${Math.floor(hours / 24)}d ${hours % 24}h`;
		if (hours > 0) return `${hours}h ${mins}m`;
		return `${mins}m`;
	};

	const truncateHash = (hash: string) => `${hash.slice(0, 8)}...${hash.slice(-8)}`;

	const getWalletRole = (escrow: DecodedEscrow): 'payer' | 'payee' | null => {
		if (!walletAddress) return null;
		try {
			const myPkh = paymentCredentialOf(walletAddress).hash;
			if (myPkh === escrow.payer) return 'payer';
			if (myPkh === escrow.payee) return 'payee';
			return null;
		} catch {
			return null;
		}
	};

	if (!isConnected) {
		return (
			<div className="card text-center py-12 px-8">
				<div className="mb-4 flex justify-center">
					<LinkIcon className="w-8 h-8 text-ivory-dim" />
				</div>
				<p className="text-ivory-dim">Connect your wallet to view escrows</p>
			</div>
		);
	}

	if (loading && escrows.length === 0) {
		return (
			<div className="space-y-3">
				{[1, 2].map((i) => (
					<div key={i} className="card">
						<div className="skeleton h-[20px] w-2/5 mb-3" />
						<div className="skeleton h-[14px] w-4/5 mb-2" />
						<div className="skeleton h-[14px] w-3/5" />
					</div>
				))}
			</div>
		);
	}

	return (
		<div className="space-y-4">
			{actionResult && (
				<div className={actionResult.type === 'success' ? 'alert-success' : 'alert-error'}>{actionResult.message}</div>
			)}

			{error && <div className="alert-error">{error}</div>}

			{escrows.length === 0 ? (
				<div className="card text-center py-12 px-8">
					<div className="mb-4 flex justify-center">
						<Inbox className="w-12 h-12 text-ivory-dim" />
					</div>
					<p className="text-ivory-dim">No active escrows found</p>
					<p className="text-xs mt-1 text-ivory-muted">Create one using the form on the left</p>
				</div>
			) : (
				escrows.map((escrow) => {
					const key = `${escrow.utxo.txHash}-${escrow.utxo.outputIndex}`;
					const expired = isExpired(escrow.deadline);
					const role = getWalletRole(escrow);
					const isLoading = actionLoading === key;

					return (
						<div key={key} className="card animate-fade-in">
							<div className="flex justify-between items-start mb-4">
								<div>
									<p className="text-xs font-semibold uppercase tracking-wider mb-1 text-ivory-muted">Escrowed</p>
									<p className="text-2xl font-bold text-gold">
										{formatAda(escrow.amount)} <span className="text-sm font-normal text-ivory-dim">ADA</span>
									</p>
								</div>
								<div className="flex flex-col items-end gap-1">
									<span className={expired ? 'badge badge-expired' : 'badge badge-active'}>
										{expired ? (
											<span className="flex items-center gap-1.5">
												<ClockAlert className="w-3.5 h-3.5" /> Expired
											</span>
										) : (
											<span className="flex items-center gap-1.5">
												<Hourglass className="w-3.5 h-3.5" /> {timeRemaining(escrow.deadline)}
											</span>
										)}
									</span>
									{role && <span className="badge badge-success">You are the {role}</span>}
								</div>
							</div>

							<div className="grid grid-cols-2 gap-3 mb-4 p-3 rounded-xl text-xs bg-bg-surface">
								<div>
									<p className="text-ivory-muted">Payer</p>
									<p className="font-mono mt-0.5 text-ivory-dim">{truncateHash(escrow.payer)}</p>
								</div>
								<div>
									<p className="text-ivory-muted">Payee</p>
									<p className="font-mono mt-0.5 text-ivory-dim">{truncateHash(escrow.payee)}</p>
								</div>
								<div>
									<p className="text-ivory-muted">Deadline</p>
									<p className="mt-0.5 text-ivory-dim">{formatDeadline(escrow.deadline)}</p>
								</div>
								<div>
									<p className="text-ivory-muted">UTxO</p>
									<p className="font-mono mt-0.5 text-ivory-dim">
										{truncateHash(escrow.utxo.txHash)}#{escrow.utxo.outputIndex}
									</p>
								</div>
							</div>

							<div className="flex gap-2">
								{!expired && (
									<button
										onClick={() => handleRelease(escrow)}
										disabled={isLoading}
										className="btn-success flex-1"
										title="Release funds to the payee (requires payee signature)">
										{isLoading ? (
											'Processing...'
										) : (
											<span className="flex items-center justify-center gap-2">
												<Check className="w-4 h-4" /> Release
											</span>
										)}
									</button>
								)}

								{expired && (
									<button
										onClick={() => handleRefund(escrow)}
										disabled={isLoading}
										className="btn-danger flex-1"
										title="Refund funds to the payer (requires payer signature)">
										{isLoading ? (
											'Processing...'
										) : (
											<span className="flex items-center justify-center gap-2">
												<RotateCcw className="w-4 h-4" /> Refund
											</span>
										)}
									</button>
								)}
							</div>
						</div>
					);
				})
			)}

			<button onClick={loadEscrows} disabled={loading} className="btn-outline w-full">
				{loading ? (
					'Refreshing...'
				) : (
					<span className="flex items-center justify-center gap-2">
						<RefreshCw className="w-4 h-4" /> Refresh Escrows
					</span>
				)}
			</button>
		</div>
	);
}
