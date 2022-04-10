import {Router} from "express";
import {MasterCredentials, MasterCredentialsProposals} from "../teaching-credentials";
import {MasterSubjectOntology, MasterSubjectProposals} from "../subject-ontology";

export const router = Router()

router.route('/masters')
  .get((req, res, next) => {
    res.send({
      data: [...MasterCredentials.instance.credentials.entries()]
    })
  })
  .post(async (req, res, next) => {
    await MasterCredentials.instance.addCredential(req.body.did, req.body.subject)
    res.sendStatus(201)
  })

router.get('/proposals', (req, res, next) => {
  res.send({
    data: [...MasterCredentialsProposals.instance._proposals.entries()]
  })
})

router.get('/subjects', (req, res, next) => {
  res.send({
    data: [...MasterSubjectOntology.instance.getSubjectOntology()]
  })
})

router.get('/subject/proposals', (req, res, next) => {
  res.send({
    data: [...MasterSubjectProposals.instance._proposals.entries()]
  })
})
