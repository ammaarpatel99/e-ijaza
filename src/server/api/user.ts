import {Router} from "express";
import {UserMasterCredentials} from "@server/teaching-credentials";
import {UserSubjectOntology} from "@server/subject-ontology";
import {UserSubjectProposals} from "@server/subject-ontology/user-subject-proposals";

export const router = Router()

router.route('/masters')
  .get((req, res, next) => {
    res.send({
      data: [...UserMasterCredentials.instance._masters.entries()]
    })
  })

// router.get('/proposals', (req, res, next) => {
//   res.send({
//     data: [...MasterCredentialsProposals.instance._proposals.entries()]
//   })
// })

router.get('/subjects', (req, res, next) => {
  res.send({
    data: [...UserSubjectOntology.instance.getSubjectOntology()]
  })
})

router.route('/subject/proposals')
  .get((req, res, next) => {
    res.send({
      data: [...UserSubjectProposals.instance._votes.entries()].map(x => [x[0], x[1].vote])
    })
  })
  .patch(async (req, res, next) => {
    await UserSubjectProposals.instance.vote(req.body.proposal, req.body.vote)
    res.sendStatus(201)
  })
  .post(async (req, res, next) => {
    await UserSubjectProposals.instance.createProposal(req.body)
    res.sendStatus(201)
  })

router.route('/credentials')
  .get((req, res, next) => {
    res.send({
      data: [...UserMasterCredentials.instance.credentials.keys()]
    })
  })
  .post(async (req, res, next) => {
    await UserMasterCredentials.instance.issueCredential(req.body.did, req.body.subject)
    res.sendStatus(201)
  })

router.post('/test', async (req, res, next) => {
  const valid = await UserMasterCredentials.instance.requestAndProveCredentials(req.body.did, req.body.subject)
  res.send({
    result: valid
  })
})
