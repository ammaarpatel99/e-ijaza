import {Router} from "express";
import {
  Config
} from '../config'

export const router = Router()

router.get('/state', (req, res, next) => {
  res.send({state: Config.instance.getConfigState()})
})

router.get('/appType', (req, res, next) => {
  res.send({appType: Config.instance.getAppType()})
})

router.post('/initialConfig', (req, res, next) => {
  Config.instance.setInitialConfig(req.body)
  res.send({state: Config.instance.getConfigState()})
})

router.get('/aries/command', (req, res, next) => {
  res.send({command: Config.instance.getAriesCommand()})
})
router.post('/aries/connect', async (req, res, next) => {
  await Config.instance.connectToAries(req.body.url)
  res.sendStatus(200)
})

router.post('/publicDID/generate', async (req, res, next) => {
  res.send(await Config.instance.createDID())
})
router.post('/publicDID/set', async (req, res, next) => {
  await Config.instance.setPublicDID(req.body.did)
  res.sendStatus(201)
})
router.post('/publicDID/check', async (req, res, next) => {
  res.send({active: await Config.instance.hasPublicDID()})
})

router.post('/initialise', async (req, res, next) => {
  await Config.instance.initialise(req.body)
  res.sendStatus(201)
})
