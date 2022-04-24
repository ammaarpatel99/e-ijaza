import {Router} from "express";
import {MasterVoteProtocol, OntologyVoteProtocol} from "../aries-based-protocols";
import {SubjectOntology} from "../subject-ontology";

export const router = Router()

// PROPOSE MASTER
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

// UPDATE HELD CREDENTIAL PUBLIC STATUS
// DELETE HELD CREDENTIAL

// ISSUE CREDENTIAL
// REVOKE CREDENTIAL

// CREATE PROOF REQUEST
// DELETE PROOF REQUEST

// RESPOND TO PROOF REQUEST
