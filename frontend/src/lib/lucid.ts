import { Blockfrost, Lucid } from '@lucid-evolution/lucid';

const BLOCKFROST_URL = process.env.NEXT_PUBLIC_BLOCKFROST_URL || 'https://cardano-preview.blockfrost.io/api/v0';
const BLOCKFROST_API_KEY = process.env.NEXT_PUBLIC_BLOCKFROST_API_KEY || '';
const NETWORK = (process.env.NEXT_PUBLIC_NETWORK || 'Preview') as 'Mainnet' | 'Preprod' | 'Preview';

export async function initLucid() {
	const lucid = await Lucid(new Blockfrost(BLOCKFROST_URL, BLOCKFROST_API_KEY), NETWORK);
	return lucid;
}

export type LucidInstance = Awaited<ReturnType<typeof Lucid>>;
