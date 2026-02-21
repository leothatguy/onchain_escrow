use aiken/collection/list
use aiken/crypto.{VerificationKeyHash}
use aiken/interval.{Finite}
use cardano/address.{VerificationKey}
use cardano/assets
use cardano/transaction.{Output, OutputReference, Transaction}
use types.{EscrowDatum, EscrowRedeemer, Locked, Refund, Release}

fn paid_to(outputs: List<Output>, pkh: VerificationKeyHash) -> Int {
  outputs
    |> list.filter(
        fn(o) { o.address.payment_credential == VerificationKey(pkh) },
      )
    |> list.map(fn(o) { assets.lovelace_of(o.value) })
    |> list.foldl(0, fn(v, acc) { acc + v })
}

validator escrow_script {
  spend(
    datum_opt: Option<EscrowDatum>,
    redeemer: EscrowRedeemer,
    _utxo_ref: OutputReference,
    self: Transaction,
  ) {
    expect Some(datum) = datum_opt
    expect datum.state == Locked

    when redeemer is {
      Release -> {
        expect list.has(self.extra_signatories, datum.payee)

        expect Finite(lower_limit) = self.validity_range.lower_bound.bound_type
        expect lower_limit < datum.deadline

        let paid = paid_to(self.outputs, datum.payee)
        expect paid >= datum.amount

        True
      }
      Refund -> {
        expect list.has(self.extra_signatories, datum.payer)

        expect Finite(lower_limit) = self.validity_range.lower_bound.bound_type
        expect lower_limit >= datum.deadline

        let paid = paid_to(self.outputs, datum.payer)
        expect paid >= datum.amount

        True
      }
    }
  }

  else(_) {
    fail
  }
}
