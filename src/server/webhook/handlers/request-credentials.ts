import {Router} from 'express'
import {AriesAgentAPIWrapper} from "../../system";
import {SchemaNames, Schemas} from "../../system/credentials";

export const router = Router()
router.post('/topic/present_proof_v2_0', async (req, res, next) => {
  if (
    req.body.role === 'prover' && req.body.by_format.pres_request.indy.name === 'Prove Subject' &&
    req.body.state === 'request-received'
  ) {
    res.sendStatus(200)
    const credentials = await AriesAgentAPIWrapper.instance.getCredentialsBySchema(Schemas.instance.getSchemaID(SchemaNames.TEACHING_CREDENTIAL))
    if (credentials.length === 0) throw new Error(`No appropriate credentials`)
    await AriesAgentAPIWrapper.instance.sendProof(req.body.pres_ex_id, {
      "indy": {
        "requested_attributes": {
          "subject": {
            "cred_id": credentials[0].referent,
            "revealed": true
          }
        },
        "requested_predicates": {},
        "self_attested_attributes": {}
      }
    })
  } else next()
})
