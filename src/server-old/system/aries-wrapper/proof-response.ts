export interface ProofResponse {
  indy: {
    requested_attributes: {},
    requested_predicates: {},
    self_attested_attributes: {
      [key: string]: string
    }
  }
}
