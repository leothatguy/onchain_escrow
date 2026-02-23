'use client';

import dynamic from 'next/dynamic';
import { Hexagon, Diamond, Lock, CheckCircle2, RotateCcw } from 'lucide-react';

const WalletConnect = dynamic(() => import('@/components/WalletConnect').then((m) => m.WalletConnect), { ssr: false });
const CreateEscrowForm = dynamic(() => import('@/components/CreateEscrowForm').then((m) => m.CreateEscrowForm), {
	ssr: false,
});
const EscrowList = dynamic(() => import('@/components/EscrowList').then((m) => m.EscrowList), { ssr: false });

export default function Home() {
	return (
		<div className="min-h-screen bg-bg">
			<header className="border-b border-border bg-black/80 backdrop-blur-md sticky top-0 z-50">
				<div className="max-w-6xl mx-auto px-6 py-4 flex justify-between items-center">
					<div>
						<h1 className="text-xl font-bold text-gold tracking-tight flex items-center gap-2">
							Cardano Escrow
						</h1>
					</div>
					<WalletConnect />
				</div>
			</header>

			<main className="max-w-6xl mx-auto px-6 py-10">
				<div className="mb-10 animate-fade-in">
					<h2 className="text-3xl font-bold mb-2 text-ivory">Secure On-Chain Escrow</h2>
					<p className="max-w-lg text-ivory-dim">
						Lock ADA with trustless smart contract guarantees. The payee releases before the deadline, or the payer gets
						an automatic refund.
					</p>
				</div>

				<div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
					<div className="animate-fade-in" style={{ animationDelay: '0.1s' }}>
						<div className="card">
							<div className="flex items-center gap-2 mb-6">
								<Hexagon className="text-gold w-6 h-6" />
								<div>
									<h3 className="text-lg font-bold text-ivory">Create Escrow</h3>
									<p className="text-xs text-ivory-muted">Lock funds securely on-chain</p>
								</div>
							</div>
							<CreateEscrowForm />
						</div>
					</div>

					<div className="animate-fade-in" style={{ animationDelay: '0.2s' }}>
						<div className="flex items-center gap-2 mb-4">
							<Diamond className="text-gold w-6 h-6" />
							<div>
								<h3 className="text-lg font-bold text-ivory">Active Escrows</h3>
								<p className="text-xs text-ivory-muted">View and manage escrows at the script address</p>
							</div>
						</div>
						<EscrowList />
					</div>
				</div>

				<div className="mt-16 animate-fade-in" style={{ animationDelay: '0.3s' }}>
					<h3 className="text-sm font-bold uppercase tracking-wider mb-6 text-ivory-muted">How It Works</h3>
					<div className="grid grid-cols-1 md:grid-cols-3 gap-6">
						{[
							{
								step: '01',
								title: 'Lock',
								desc: 'Payer deposits ADA into the smart contract with a deadline and designated payee.',
								icon: <Lock className="w-6 h-6" />,
							},
							{
								step: '02',
								title: 'Release',
								desc: 'Before the deadline, the payee can sign a transaction to claim the locked funds.',
								icon: <CheckCircle2 className="w-6 h-6" />,
							},
							{
								step: '03',
								title: 'Refund',
								desc: 'If the deadline passes without release, the payer can reclaim their ADA.',
								icon: <RotateCcw className="w-6 h-6" />,
							},
						].map((item) => (
							<div key={item.step} className="card p-6">
								<div className="flex items-center gap-3 mb-3">
									<span className="text-xs font-bold px-2 py-1 rounded-md bg-gold-dim text-gold">{item.step}</span>
									<span className="flex items-center justify-center text-ivory">{item.icon}</span>
								</div>
								<h4 className="font-bold mb-1 text-ivory">{item.title}</h4>
								<p className="text-sm leading-relaxed text-ivory-muted">{item.desc}</p>
							</div>
						))}
					</div>
				</div>

				<footer className="mt-16 pb-8 text-center">
					<p className="text-xs text-ivory-muted">
						<span className="text-gold">leothatguy</span> ·{' '}
						<span className="text-ivory-dim">Aiken</span> ·{' '}
						<span className="text-ivory-dim">Lucid Evolution</span> ·{' '}
						<span className="text-ivory-dim">Cardano Plutus V3</span>
					</p>
				</footer>
			</main>
		</div>
	);
}
