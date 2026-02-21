'use client';

import React, { useState, useRef } from 'react';
import { useWallet } from '@/context/WalletContext';
import { lockFunds } from '@/lib/escrow';
import { paymentCredentialOf } from '@lucid-evolution/lucid';
import { CheckCircle2, Loader2, Calendar, Clock } from 'lucide-react';
import { format } from 'date-fns';
import { DayPicker } from 'react-day-picker';
import * as Popover from '@radix-ui/react-popover';
import 'react-day-picker/dist/style.css';

export function CreateEscrowForm() {
	const { lucid, isConnected } = useWallet();
	const [payeeAddress, setPayeeAddress] = useState('');
	const [amount, setAmount] = useState('');
	const [deadlineDate, setDeadlineDate] = useState<Date | undefined>(undefined);
	const [deadlineTime, setDeadlineTime] = useState('12:00:00');
	const [dateOpen, setDateOpen] = useState(false);
	const timeInputRef = useRef<HTMLInputElement>(null);
	const [loading, setLoading] = useState(false);
	const [error, setError] = useState<string | null>(null);
	const [txHash, setTxHash] = useState<string | null>(null);

	const handleSubmit = async (e: React.FormEvent) => {
		e.preventDefault();
		if (!lucid) return;

		try {
			setLoading(true);
			setError(null);
			setTxHash(null);

			const amountLovelace = Math.floor(parseFloat(amount) * 1_000_000);
			if (amountLovelace < 2_000_000) {
				setError('Minimum amount is 2 ADA');
				return;
			}

			let payeePkh: string;
			try {
				payeePkh = paymentCredentialOf(payeeAddress).hash;
			} catch {
				setError('Invalid payee address — could not extract public key hash');
				return;
			}

			if (!deadlineDate || !deadlineTime) {
				setError('Both date and time are required');
				return;
			}

			const dateStr = format(deadlineDate, 'yyyy-MM-dd');
			const deadlineMs = new Date(`${dateStr}T${deadlineTime}`).getTime();
			if (isNaN(deadlineMs) || deadlineMs <= Date.now()) {
				setError('Deadline must be a valid future date and time');
				return;
			}

			const hash = await lockFunds(lucid, payeePkh, deadlineMs, amountLovelace);
			setTxHash(hash);

			setPayeeAddress('');
			setAmount('');
			setDeadlineDate(undefined);
			setDeadlineTime('12:00:00');
		} catch (err) {
			const msg = err instanceof Error ? err.message : 'Failed to create escrow';
			setError(msg);
			console.error('Lock funds error:', err);
		} finally {
			setLoading(false);
		}
	};

	return (
		<form onSubmit={handleSubmit} className="space-y-5">
			{error && <div className="alert-error">{error}</div>}

			{txHash && (
				<div className="alert-success">
					<p className="font-semibold mb-1 flex items-center gap-2">
						<CheckCircle2 className="w-5 h-5" /> Escrow Created!
					</p>
					<p className="font-mono text-xs break-all opacity-80">Tx: {txHash}</p>
				</div>
			)}

			<div>
				<label className="label">Payee Address</label>
				<input
					type="text"
					value={payeeAddress}
					onChange={(e) => setPayeeAddress(e.target.value)}
					placeholder="addr_test1q..."
					className="input"
					required
					disabled={!isConnected}
				/>
				<p className="text-xs mt-1.5 text-ivory-muted">The Cardano address that will receive the funds on release</p>
			</div>

			<div>
				<label className="label">Amount (ADA)</label>
				<input
					type="number"
					value={amount}
					onChange={(e) => setAmount(e.target.value)}
					placeholder="10"
					step="0.5"
					min="2"
					className="input"
					required
					disabled={!isConnected}
				/>
				<p className="text-xs mt-1.5 text-ivory-muted">Minimum 2 ADA · Will be locked until released or refunded</p>
			</div>

			<div>
				<div className="grid grid-cols-2 gap-4">
					<div className="relative">
						<label className="label">Deadline Date</label>
						<Popover.Root open={dateOpen} onOpenChange={setDateOpen}>
							<Popover.Trigger asChild>
								<button
									type="button"
									disabled={!isConnected}
									className="input flex items-center justify-between text-left">
									{deadlineDate ? format(deadlineDate, 'PPP') : <span className="text-ivory-muted">Select date</span>}
									<Calendar className="w-4 h-4 text-ivory-muted" />
								</button>
							</Popover.Trigger>
							<Popover.Portal>
								<Popover.Content
									className={`z-50 rounded-xl border p-3 shadow-xl bg-bg border-border
										[&_.rdp]:m-0 [&_.rdp]:text-ivory 
										[&_.rdp]:[--rdp-cell-size:40px] 
										[&_.rdp]:[--rdp-accent-color:var(--color-gold)] 
										[&_.rdp]:[--rdp-background-color:var(--color-gold-dim)] 
										[&_.rdp-day_selected]:text-black [&_.rdp-day_selected]:font-bold 
										[&_.rdp-button:hover:not([disabled]):not(.rdp-day_selected)]:bg-bg-surface-hover`}
									align="start"
									sideOffset={4}>
									<DayPicker
										mode="single"
										selected={deadlineDate}
										onSelect={(date) => {
											setDeadlineDate(date);
											setDateOpen(false);
										}}
									/>
								</Popover.Content>
							</Popover.Portal>
						</Popover.Root>
					</div>
					<div className="relative">
						<label className="label">Deadline Time</label>
						<div className="relative">
							<input
								type="time"
								value={deadlineTime}
								onChange={(e) => setDeadlineTime(e.target.value)}
								className="input pr-10 appearance-none [&::-webkit-calendar-picker-indicator]:hidden [&::-webkit-calendar-picker-indicator]:appearance-none"
								required
								disabled={!isConnected}
								style={{ colorScheme: 'dark' }}
								ref={timeInputRef}
							/>
							<Clock className="absolute right-3 top-1/2 -translate-y-1/2 w-4 h-4 pointer-events-none text-ivory-muted" />
						</div>
					</div>
				</div>
				<p className="text-xs mt-1.5 text-ivory-muted">Payee can release before · Payer can refund after</p>
			</div>

			<button type="submit" disabled={loading || !isConnected} className="btn-gold w-full">
				{loading ? (
					<span className="flex items-center justify-center gap-2">
						<Loader2 className="w-4 h-4 animate-spin" />
						Locking Funds...
					</span>
				) : !isConnected ? (
					'Connect Wallet First'
				) : (
					'Lock Funds in Escrow'
				)}
			</button>
		</form>
	);
}
