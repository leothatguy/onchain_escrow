use aiken/collection/list
use aiken/interval.{Finite, after, before}
use cardano/address.{from_verification_key}
use cardano/assets
use cardano/transaction.{NoDatum, Output, Transaction, placeholder}
use types.{EscrowDatum, Locked}

const payer_pkh: ByteArray =
  #"0000000000000000000000000000000000000000000000000000000000000001"

const payee_pkh: ByteArray =
  #"0000000000000000000000000000000000000000000000000000000000000002"

const deadline: Int = 1000

const amount: Int = 2_000_000

fn test_datum() -> EscrowDatum {
  EscrowDatum {
    state: Locked,
    payer: payer_pkh,
    payee: payee_pkh,
    deadline,
    amount,
  }
}

fn output_to_pkh(pkh: ByteArray, lovelace: Int) -> Output {
  Output {
    address: from_verification_key(pkh),
    value: assets.from_lovelace(lovelace),
    datum: NoDatum,
    reference_script: None,
  } 
}

fn paid_to(outputs: List<Output>, pkh: ByteArray) -> Int {
  outputs
    |> list.filter(
        fn(o) { o.address.payment_credential == address.VerificationKey(pkh) },
      )
    |> list.map(fn(o) { assets.lovelace_of(o.value) })
    |> list.foldl(0, fn(v, acc) { acc + v })
}

test test_release_success() {
  let datum = test_datum()
  let tx =
    Transaction {
      ..placeholder,
      outputs: [output_to_pkh(payee_pkh, amount)],
      validity_range: before(deadline - 1),
      extra_signatories: [payee_pkh],
    }
  expect list.has(tx.extra_signatories, datum.payee)
  expect Finite(upper_limit) = tx.validity_range.upper_bound.bound_type
  expect upper_limit < datum.deadline
  let paid = paid_to(tx.outputs, datum.payee)
  expect paid >= datum.amount
  True
}

test test_release_fails_without_payee_signature() fail {
  let datum = test_datum()
  let tx =
    Transaction {
      ..placeholder,
      outputs: [output_to_pkh(payee_pkh, amount)],
      validity_range: before(deadline - 1),
      extra_signatories: [],
    }
  expect list.has(tx.extra_signatories, datum.payee)
  True
}

test test_release_fails_after_deadline() fail {
  let datum = test_datum()
  let tx =
    Transaction {
      ..placeholder,
      outputs: [output_to_pkh(payee_pkh, amount)],
      validity_range: before(deadline + 100),
      extra_signatories: [payee_pkh],
    }
  expect Finite(upper_limit) = tx.validity_range.upper_bound.bound_type
  expect upper_limit < datum.deadline
  True
}

test test_release_fails_insufficient_payment() fail {
  let datum = test_datum()
  let tx =
    Transaction {
      ..placeholder,
      outputs: [output_to_pkh(payee_pkh, amount - 1)],
      validity_range: before(deadline - 1),
      extra_signatories: [payee_pkh],
    }
  let paid = paid_to(tx.outputs, datum.payee)
  expect paid >= datum.amount
  True
}

test test_refund_success() {
  let datum = test_datum()
  let tx =
    Transaction {
      ..placeholder,
      outputs: [output_to_pkh(payer_pkh, amount)],
      validity_range: after(deadline),
      extra_signatories: [payer_pkh],
    }
  expect list.has(tx.extra_signatories, datum.payer)
  expect Finite(lower_limit) = tx.validity_range.lower_bound.bound_type
  expect lower_limit >= datum.deadline
  let paid = paid_to(tx.outputs, datum.payer)
  expect paid >= datum.amount
  True
}

test test_refund_fails_without_payer_signature() fail {
  let datum = test_datum()
  let tx =
    Transaction {
      ..placeholder,
      outputs: [output_to_pkh(payer_pkh, amount)],
      validity_range: after(deadline),
      extra_signatories: [],
    }
  expect list.has(tx.extra_signatories, datum.payer)
  True
}

test test_refund_fails_before_deadline() fail {
  let datum = test_datum()
  let tx =
    Transaction {
      ..placeholder,
      outputs: [output_to_pkh(payer_pkh, amount)],
      validity_range: after(deadline - 100),
      extra_signatories: [payer_pkh],
    }
  expect Finite(lower_limit) = tx.validity_range.lower_bound.bound_type
  expect lower_limit >= datum.deadline
  True
}

test test_refund_fails_insufficient_payment() fail {
  let datum = test_datum()
  let tx =
    Transaction {
      ..placeholder,
      outputs: [output_to_pkh(payer_pkh, amount - 1)],
      validity_range: after(deadline),
      extra_signatories: [payer_pkh],
    }
  let paid = paid_to(tx.outputs, datum.payer)
  expect paid >= datum.amount
  True
}
