interface NonRevokedData {
  from: number
  to: number
}

type restrictions = 'schema_id'|"schema_name"|'schema_version'|'issuer_did'|'cred_def_id'

type predicates = '<' | '<=' | '>=' | '>'

export interface ProofReqData {
  comment?: string
  connection_id: string
  trace?: boolean
  proof_request: {
    name?: string
    non_revoked?: NonRevokedData
    nonce?: string
    version?: string
    requested_attributes: {
      [key: string]: {
        name: string
        non_revoked?: NonRevokedData
        restrictions?: {
          [x in `attr::${any}::value`|restrictions]?: string
        }[]
      }
    }
    requested_predicates: {
      [key: string]: {
        name: string
        non_revoked?: NonRevokedData
        p_type: predicates
        p_value: number
        restrictions?: {
          [x in `attr::${any}::value`|restrictions]?: string
        }[]
      }
    }
  }
}

export interface ProofReqRes {
  presentation_exchange_id: string
}

export interface ProofProposalData {
  auto_present?: boolean
  comment?: string
  connection_id?: string
  trace?: boolean
  presentation_proposal: {
    attributes: {
      cred_def_id?: string
      "mime-type"?: string
      name: string
      referent?: string
      value?: string
    }[]
    predicates: {
      cred_def_id?: string
      name: string
      threshold: number
      predicate: predicates
    }[]
  }
}

export interface ProofProposalRes {
  presentation_exchange_id: string
}

export interface ProofPresentationData {
  trace?: boolean
  requested_attributes: {
    [key: string]: {
      cred_id: string
      revealed?: boolean
    }
  }
  requested_predicates: {
    [key: string]: {
      cred_id: string
      timestamp: number
    }
  }
  self_attested_attributes: {
    [key: string]: string
  }
}

export interface ProofPresentationRes {}

export interface GetProofRes {
  role: 'prover'|'verifier'
  state: 'proposal_sent'|'proposal_received'|'request_sent'|'request_received'|'presentation_sent'|'presentation_received'|'verified'|'presentation_acked'
  thread_id: string
  verified: 'true'|'false'
  presentation_proposal_dict: {
    comment: string
    presentation_proposal: {
      attributes: ProofProposalData['presentation_proposal']['attributes']
      predicates: ProofProposalData['presentation_proposal']['predicates']
    }
  }
  presentation_request: ProofReqData['proof_request']
}

export interface GetProofsRes {
  results: GetProofRes[]
}
