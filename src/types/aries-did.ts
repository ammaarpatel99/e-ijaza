export interface DidResult {
  result: {
    did: string
    key_type: 'ed25519' | 'bls12381g2'
    method: 'sov' | 'key'
    posture: 'public' | 'posted' | 'wallet_only'
    verkey: string
  }
}
