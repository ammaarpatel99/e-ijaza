import {Router} from 'express'
import {router as initialiseUserDataHandler} from './handlers/initial-user-data'
import {router as requestCredentialsHandler} from './handlers/request-credentials'

export const router = Router()

router.use(initialiseUserDataHandler)
router.use(requestCredentialsHandler)

router.post('*', (req, res) => {
  res.sendStatus(200)
  console.log()
  console.log(req.url)
  console.log(req.body)
  console.log()
})
