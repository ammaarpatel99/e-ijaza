export interface HeldCredential<T> {
  attrs: T,
  "cred_def_id": string, // "WgWxqztrNooG92RXvxSTWv:3:CL:20:tag",
  "cred_rev_id": string, // "12345",
  "referent": string, // "3fa85f64-5717-4562-b3fc-2c963f66afa6",
  "rev_reg_id": string, // "WgWxqztrNooG92RXvxSTWv:4:WgWxqztrNooG92RXvxSTWv:3:CL:20:tag:CL_ACCUM:0",
  "schema_id": string, // "WgWxqztrNooG92RXvxSTWv:2:schema_name:1.0"
}

export function getHeldCredentials(): HeldCredential<any>[] {
  throw new Error(`Not implemented`)
}
