import {Router} from "express";
import {WebhookMonitor} from "@server/webhook/webhook-monitor";

export const router = Router()

router.post('/topic/issue_credential',  async (req, res, next) => {
  res.sendStatus(200)
  const monitored = await WebhookMonitor.instance.receiveCredentialExchange(req.body)
  if (!monitored) {
    console.log()
    console.log('Webhook received CREDENTIAL')
    console.log(req.body)
    console.log()
  }
})

router.post('/topic/present_proof', async (req, res, next) => {
  res.sendStatus(200)
  const monitored = await WebhookMonitor.instance.receiveProofPresentation(req.body)
  if (!monitored) {
    console.log()
    console.log('Webhook received PROOF')
    console.log(req.body)
    console.log()
  }

})

router.post('/topic/connections', async (req, res, next) => {
  res.sendStatus(200)
  const monitored = await WebhookMonitor.instance.receiveConnection(req.body)
  if (!monitored) {
    console.log()
    console.log('Webhook received CONNECTION')
    console.log(req.body)
    console.log()
  }

})

router.post('*', (req, res, next) => {
  res.sendStatus(200)
  console.log()
  console.log(`unknown webhook`)
  console.log(req.url)
  console.log(req.body)
  console.log()
})
