import {definitions} from './aries-autogen-types'

export interface V10CredentialBoundOfferRequest{
  counter_proposal: {
    '@id'?: string
    comment?: string
    cred_def_id?: string
    credential_proposal?: definitions['CredentialPreview']
    issuer_did?: string
    schema_id?: string
    schema_issuer_did?: string
    schema_name?: string
    schema_version?: string
  }
}

export interface V10PresentationExchange {
  auto_present?: boolean;
  connection_id?: string;
  created_at?: string;
  error_msg?: string;
  initiator?: "self" | "external";
  presentation?: {
    identifiers?: definitions['IndyProofIdentifier'][]
    proof?: {
      aggregated_proof?: {
        c_hash?: string
        c_list?: number[]
      }
      proofs?: definitions['IndyProofProofProofsProof'][]
    }
    requested_proof?: {
      predicates?: {[key: string]: definitions['IndyProofRequestedProofPredicate']}
      revealed_attr_groups?: {[key: string]: definitions['IndyProofRequestedProofRevealedAttrGroup']}
      revealed_attrs?: {[key: string]: definitions['IndyProofRequestedProofRevealedAttr']}
      self_attested_attrs?: {[ley: string]: string}
      unrevealed_attrs?: {[key: string]: string}
    }
  }
  presentation_exchange_id?: string;
  presentation_proposal_dict?: {
    "@id"?: string
    "@type"?: string
    comment?: string
    presentation_proposal: definitions['IndyPresPreview']
  }
  presentation_request?: {
    name?: string
    non_revoked?: {
      from?: number
      to?: number
    }
    nonce?: string
    requested_attributes: {[key: string]: definitions['IndyProofReqAttrSpec']}
    requested_predicates: {[key: string]: definitions['IndyProofReqPredSpec']}
    version?: string
  }
  presentation_request_dict?: {
    "@id"?: string
    "@type"?: string
    comment?: string
    "request_presentations~attach": definitions['AttachDecorator'][]
  }
  role?: "prover" | "verifier";
  state?: string;
  thread_id?: string;
  trace?: boolean;
  updated_at?: string;
  verified?: "true" | "false";
}

export interface V10PresentationExchangeList {
  results?: V10PresentationExchange[]
}

export interface RevokeRequest {
  comment?: string
  connection_id?: string
  cred_ex_id?: string
  cred_rev_id?: string
  notify?: boolean,
  publish?: boolean
  rev_reg_id?: string
  thread_id?: string
}

export interface V10CredentialExchange {
  auto_issue?: boolean
  auto_offer?: boolean
  auto_remove?: boolean
  connection_id?: string
  created_at?: string
  revoc_reg_id?: string
  revocation_id?: string
  credential?: {
    cred_def_id?: string
    cred_rev_id?: string
    referent?: string
    rev_reg_id?: string
    schema_id?: string
    attrs?: {[key: string]: string}
  }
  parent_thread_id?: string
  credential_offer?: {
    cred_def_id: string
    key_correctness_proof: {}
    schema_id: string
  }
  credential_definition_id?: string
  credential_exchange_id?: string
  credential_id?: string
  credential_offer_dict?: {
    credential_preview?: definitions['CredentialPreview']
    "offers~attach": definitions['AttachDecorator'][]
  }
  credential_proposal_dict?: {
    cred_def_id?: string
    credential_proposal?: definitions['CredentialPreview']
    issuer_did?: string
    schema_id?: string
  }
  credential_request?: {
    cred_def_id: string
  }
  error_msg?: string
  initiator?: 'self'|'external'
  schema_id?: string
  state?: string
}

export interface V10CredentialExchangeList {
  results?: V10CredentialExchange[]
}

export interface RevocationNotification {
  thread_id: string
  comment: string
}
