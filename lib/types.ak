use aiken/crypto.{VerificationKeyHash}

pub type EscrowState {
  Locked
}

pub type EscrowDatum {
  state: EscrowState,
  payer: VerificationKeyHash,
  payee: VerificationKeyHash,
  deadline: Int,
  amount: Int,
}

pub type EscrowRedeemer {
  Release
  Refund
}
