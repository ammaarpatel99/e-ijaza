import {Router} from "express";
import {MasterVoteProtocol} from "../aries-based-protocols";

export const router = Router()

// PROPOSE MASTER
router.post('/master/vote', (req, res, next) => {
  MasterVoteProtocol.instance.sendVote$(req.body).subscribe({
    next: () => res.send({}),
    error: err => next(err)
  })
})

// PROPOSE SUBJECT
// VOTE ON SUBJECT PROPOSAL

// GET DESCENDANTS

// UPDATE HELD CREDENTIAL PUBLIC STATUS
// DELETE HELD CREDENTIAL

// ISSUE CREDENTIAL
// REVOKE CREDENTIAL

// CREATE PROOF REQUEST
// DELETE PROOF REQUEST

// RESPOND TO PROOF REQUEST
