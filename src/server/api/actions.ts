import {Router} from "express";
import {MasterVoteProtocol, OntologyVoteProtocol} from "../aries-based-protocols";
import {SubjectOntology} from "../subject-ontology";
import {UserCredentialsManager} from "../credentials";

export const router = Router()

router.post('/master/propose', (req, res, next) => {
  MasterVoteProtocol.instance.createProposal$(req.body).subscribe({
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

// PROPOSE SUBJECT
router.post('/ontology/vote', (req, res, next) => {
  OntologyVoteProtocol.instance.sendVote$(req.body).subscribe({
    next: () => res.send({}),
    error: err => next(err)
  })
})

router.post('/descendants', (req, res, next) => {
  SubjectOntology.instance.getDescendants$(req.body).subscribe({
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

// ISSUE CREDENTIAL
// REVOKE CREDENTIAL

// CREATE PROOF REQUEST
// DELETE PROOF REQUEST

// RESPOND TO PROOF REQUEST
