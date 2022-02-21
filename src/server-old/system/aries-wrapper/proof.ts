export interface Proof {
  state: 'request-sent'|'request-received'|'proposal-sent'|'proposal-received'|'presentation-sent'|'presentation-received'|'abandoned'|'done'
  by_format: {
    pres: {
      indy: {
        requested_proof: {
          revealed_attrs: {
            [key: string]: {
              raw: string
            }
          }
          self_attested_attrs: {
            [key: string]: string
          }
        }
        identifiers: {
          cred_def_id: string
        }[]
      }
    }
  }
}
