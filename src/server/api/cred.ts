import {Router} from 'express'
import {AriesAgentAPIWrapper} from "../system";
import {SchemaNames, Schemas} from "../system/credentials";
import {MasterCredentials} from "../system/state/master-credentials";
import {ChainOfTrustVerification} from "../system/state/chain-of-trust-verification";

export const router = Router()

router.get('', async (req, res) => {
  const credentials = await AriesAgentAPIWrapper.instance.getCredentialsBySchema(Schemas.instance.getSchemaID(SchemaNames.TEACHING_CREDENTIAL))
  res.send({credentials})
})

router.post('/issue', async (req, res) => {
  const did = req.body.did
  await MasterCredentials.instance.issueToDID(did)
  res.status(201).send()
})

router.post('/chainOfTrust', async (req, res) => {
  const credDef = req.body.cred_def_id
  const prover = new ChainOfTrustVerification(ChainOfTrustVerification.didFromCredDef(credDef))
  const dids = await prover.prove()
  res.send({dids})
})

router.get('/publicDID', async (req, res) => {
  const did = await AriesAgentAPIWrapper.instance.getPublicDID()
  res.send({did})
})
