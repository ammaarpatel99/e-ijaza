import {Router} from "express";
import {WebhookMonitor} from './webhook-monitor'

export const router = Router()

router.post('/topic/issue_credential',  (req, res, next) => {
  res.sendStatus(200)
  WebhookMonitor.instance.processCredential(req.body)
})

router.post('/topic/present_proof', (req, res, next) => {
  res.sendStatus(200)
  WebhookMonitor.instance.processProof(req.body)
})

router.post('/topic/connections', (req, res, next) => {
  res.sendStatus(200)
  WebhookMonitor.instance.processConnection(req.body)
})

router.post(`/topic/revocation-notification`,  (req, res, next) => {
  res.sendStatus(200)
  WebhookMonitor.instance.processRevocation(req.body)
})

router.post('*', (req, res, next) => {
  res.sendStatus(200)
  // console.log()
  // console.log(`unknown webhook`)
  // console.log(req.url)
  // console.log(req.body)
  // console.log()
})
