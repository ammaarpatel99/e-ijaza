import {Router} from "express";
import {respondToUserRequestForSchemas} from "@server/schemas/user-schemas";
import {Config} from "@server/config";
import {AppType} from "@types";

export const router = Router()

router.use(async (req, res, next) => {
  if (Config.instance.getAppType() === AppType.MASTER && req.url === '/topic/present_proof/' && req.body?.presentation_request?.name === 'Set Up' && req.body.state === 'request_received') {
    await respondToUserRequestForSchemas(req.body.presentation_exchange_id)
  }
  next()
})

router.post('*', (req, res, next) => {
  res.sendStatus(200)
  console.log()
  console.log(req.url)
  console.log(req.body)
  console.log()
})

// /topic/present_proof/
//
// {
//   initiator: 'external',
//   role: 'prover',
//   presentation_exchange_id: 'f734f455-2f84-4f7f-8d27-b059bedebc6b',
//   state: 'request_received',
//   updated_at: '2022-02-23T07:23:38.146254Z',
//   presentation_request: {
//     nonce: '1169139374723243252790195',
//     name: 'Set Up',
//     version: '1.0',
//     requested_attributes: { teachingSchema: [Object], teachingCredDef: [Object] },
//     requested_predicates: {}
//   },
//   presentation_request_dict: {
//     '@type': 'did:sov:BzCbsNYhMrjHiqZDTUASHg;spec/present-proof/1.0/request-presentation',
//     '@id': '46abf54a-6cae-4aef-9f9a-0d4b02092edb',
//     'request_presentations~attach': [ [Object] ]
//   },
//   created_at: '2022-02-23T07:23:38.146254Z',
//   trace: false,
//   thread_id: '46abf54a-6cae-4aef-9f9a-0d4b02092edb',
//   connection_id: '36f6f450-53df-4e54-bc1e-de7e5856628e'
// }
