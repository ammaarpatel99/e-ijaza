import {Router} from "express";
import {MasterVoteProtocol, OntologyVoteProtocol} from "../aries-based-protocols";
import {SubjectOntology} from "../subject-ontology";
import {CredentialProofManager, UserCredentialsManager} from "../credentials";
import {State} from "../state";
import {first, switchMap} from "rxjs";
import {Server} from '@project-types'
import {MasterProposalsManager} from "../master-credentials";

export const router = Router()

router.post('/master/propose', (req, res, next) => {
  State.instance._appType$.pipe(
    first(),
    switchMap(appType => appType === Server.AppType.USER
      ? MasterVoteProtocol.instance.createProposal$(req.body)
      : MasterProposalsManager.instance.controllerCreateProposal$(req.body)
    )
  ).subscribe({
    next: () => res.send({}),
    error: err => next(err)
  })
})
router.post('/master/vote', (req, res, next) => {
  MasterVoteProtocol.instance.sendVote$(req.body).subscribe({
    next: () => res.send({}),
    error: err => next(err)
  })
})


router.post('/ontology/propose', (req, res, next) => {
  OntologyVoteProtocol.instance.createProposal$(req.body).subscribe({
    next: () => res.send({}),
    error: err => next(err)
  })
})
router.post('/ontology/vote', (req, res, next) => {
  OntologyVoteProtocol.instance.sendVote$(req.body).subscribe({
    next: () => res.send({}),
    error: err => next(err)
  })
})

router.post('/descendants', (req, res, next) => {
  SubjectOntology.instance.getDescendants$(req.body.subject).subscribe({
    next: data => res.send([...data]),
    error: err => next(err)
  })
})



router.put('/credential/update', (req, res, next) => {
  UserCredentialsManager.instance.updatePublicStatus$(req.body).subscribe({
    next: () => res.send({}),
    error: err => next(err)
  })
})
router.post('/credential/delete', (req, res, next) => {
  UserCredentialsManager.instance.deleteCred$(req.body).subscribe({
    next: () => res.send({}),
    error: err => next(err)
  })
})

router.post('/credential/issue', (req, res, next) => {
  UserCredentialsManager.instance.issue$(req.body).subscribe({
    next: () => res.send({}),
    error: err => next(err)
  })
})
router.post('/credential/revoke', (req, res, next) => {
  UserCredentialsManager.instance.revoke$(req.body).subscribe({
    next: () => res.send({}),
    error: err => next(err)
  })
})

router.post('/proof/create', (req, res, next) => {
  CredentialProofManager.instance.makeProofRequest(req.body)
  res.send({})
})
router.post('/proof/delete', (req, res, next) => {
  CredentialProofManager.instance.deleteOutgoingProofRequest(req.body)
  res.send({})
})

router.post('/proof/respond', (req, res, next) => {
  CredentialProofManager.instance.respondToRequest$(req.body).subscribe({
    next: () => res.send({}),
    error: err => next(err)
  })
})
