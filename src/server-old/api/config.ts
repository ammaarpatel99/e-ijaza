import {Router} from 'express'
import {
  Config
} from '../system'

export const router = Router()

router.get('/state', (req, res) => {
  res.send({state: Config.instance.state})
})

router.get('/appType', (req, res) => {
  res.send({appType: Config.instance.appType})
})

router.post('/initialise', async (req, res) => {
  const config = Config.instance
  const data = req.body
  // TODO: sanitise data
  await config.setInitialConfiguration(data)
  res.sendStatus(201)
})

router.get('/ariesAgent/terminalCommand', (req, res) => {
  res.send({command: Config.instance.ariesAgentTerminalCommand})
})

router.post('/ariesAgent/running', async (req, res) => {
  await Config.instance.ariesAgentIsReady()
  res.sendStatus(201)
})

router.post('/publicDid/generate', async (req, res) => {
  res.send(await Config.instance.generatePublicDID())
})

router.post('/publicDid', async (req, res) => {
  await Config.instance.setPublicDID(req.body.did)
  res.sendStatus(201)
})
