import { Constr, Data, validatorToAddress, paymentCredentialOf, type UTxO, type Network } from '@lucid-evolution/lucid';
import type { LucidInstance } from './lucid';
import plutusBlueprint from './plutus.json';

const NETWORK: Network = (process.env.NEXT_PUBLIC_NETWORK || 'Preview') as Network;

export function readValidator() {
	const spendValidator = plutusBlueprint.validators.find((v) => v.title === 'escrow.escrow_script.spend');
	if (!spendValidator) {
		throw new Error('Spend validator not found in plutus.json');
	}
	return {
		type: 'PlutusV3' as const,
		script: spendValidator.compiledCode,
	};
}

export function getScriptAddress(): string {
	const validator = readValidator();
	return validatorToAddress(NETWORK, validator);
}


/**
 * Serialize an EscrowDatum into CBOR format.
 *
 * @param payerPkh   - Payer's public key hash (hex string, 56 chars)
 * @param payeePkh   - Payee's public key hash (hex string, 56 chars)
 * @param deadline   - POSIX timestamp in milliseconds
 * @param amount     - Amount in lovelace
 */
export function buildDatum(payerPkh: string, payeePkh: string, deadline: number, amount: number): string {
	return Data.to(new Constr(0, [new Constr(0, []), payerPkh, payeePkh, BigInt(deadline), BigInt(amount)]));
}

export function decodeDatum(datumCbor: string) {
	try {
		const decoded = Data.from(datumCbor) as Constr<Data>;

		const fields = decoded.fields;

		return {
			state: 'Locked' as const,
			payer: fields[1] as string,
			payee: fields[2] as string,
			deadline: Number(fields[3] as bigint),
			amount: Number(fields[4] as bigint),
		};
	} catch (e) {
		console.error('Failed to decode datum:', e);
		return null;
	}
}

export async function lockFunds(
	lucid: LucidInstance,
	payeePkh: string,
	deadline: number,
	amountLovelace: number,
): Promise<string> {
	const scriptAddress = getScriptAddress();

	const payerAddress = await lucid.wallet().address();
	const payerCredential = paymentCredentialOf(payerAddress);
	const payerPkh = payerCredential.hash;

	const datumCbor = buildDatum(payerPkh, payeePkh, deadline, amountLovelace);

	const tx = await lucid
		.newTx()
		.pay.ToAddressWithData(scriptAddress, { kind: 'inline', value: datumCbor }, { lovelace: BigInt(amountLovelace) })
		.complete();

	const signedTx = await tx.sign.withWallet().complete();
	const txHash = await signedTx.submit();

	return txHash;
}

export async function releaseFunds(lucid: LucidInstance, utxo: UTxO): Promise<string> {
	const validator = readValidator();

	if (!utxo.datum) throw new Error('UTxO has no inline datum');
	const datum = decodeDatum(utxo.datum);
	if (!datum) throw new Error('Could not decode datum');

	const releaseRedeemer = Data.to(new Constr(0, []));

	const payeeAddress = await lucid.wallet().address();

	const now = Date.now();

	const tx = await lucid
		.newTx()
		.collectFrom([utxo], releaseRedeemer)
		.attach.SpendingValidator(validator)
		.addSignerKey(datum.payee)
		.pay.ToAddress(payeeAddress, {
			lovelace: BigInt(datum.amount),
		})
		.validFrom(now - 60_000)
		.validTo(datum.deadline - 1)
		.complete();

	const signedTx = await tx.sign.withWallet().complete();
	const txHash = await signedTx.submit();

	return txHash;
}

export async function refundFunds(lucid: LucidInstance, utxo: UTxO): Promise<string> {
	const validator = readValidator();

	if (!utxo.datum) throw new Error('UTxO has no inline datum');
	const datum = decodeDatum(utxo.datum);
	if (!datum) throw new Error('Could not decode datum');

	const refundRedeemer = Data.to(new Constr(1, []));

	const payerAddress = await lucid.wallet().address();

	const now = Date.now();

	const tx = await lucid
		.newTx()
		.collectFrom([utxo], refundRedeemer)
		.attach.SpendingValidator(validator)
		.addSignerKey(datum.payer)
		.pay.ToAddress(payerAddress, {
			lovelace: BigInt(datum.amount),
		})
		.validFrom(datum.deadline)
		.validTo(now + 15 * 60_000)
		.complete();

	const signedTx = await tx.sign.withWallet().complete();
	const txHash = await signedTx.submit();

	return txHash;
}

export async function getEscrowUtxos(lucid: LucidInstance): Promise<UTxO[]> {
	const scriptAddress = getScriptAddress();
	const utxos = await lucid.utxosAt(scriptAddress);
	return utxos;
}
