import {Router} from 'express'
import {respondToSchemasForUserRequest} from '../../system/initialisation'

export const router = Router()
router.post('/topic/present_proof_v2_0', async (req, res, next) => {
  if (
    req.body.role === 'prover' && req.body.by_format.pres_request.indy.name === 'Initialisation Data' &&
    req.body.state === 'request-received'
  ) {
    res.sendStatus(200)
    await respondToSchemasForUserRequest(req.body.pres_ex_id)
  } else next()
})
