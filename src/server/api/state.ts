import {Router} from "express";
import {StateManager} from './state-manager'
import {Initialisation} from '../initialisation'

export const router = Router()

// UPDATE CALLS

router.post('/update', (req, res, next) => {
  const body = StateManager.instance.getStateUpdate(req.body)
  res.send(body)
})

router.get('/masters', (req, res, next) => {
  const data = StateManager.instance.masters;
  res.send(data)
})

router.get('/masterProposals', (req, res, next) => {
  const data = StateManager.instance.masterProposals;
  res.send(data)
})

router.get('/subjects', (req, res, next) => {
  const data = StateManager.instance.subjects;
  res.send(data)
})

router.get('/subjectProposals', (req, res, next) => {
  const data = StateManager.instance.subjectProposals;
  res.send(data)
})

router.get('/heldCredentials', (req, res, next) => {
  const data = StateManager.instance.heldCredentials;
  res.send(data)
})

router.get('/issuedCredentials', (req, res, next) => {
  const data = StateManager.instance.issuedCredentials;
  res.send(data)
})

router.get('/reachableSubjects', (req, res, next) => {
  const data = StateManager.instance.reachableSubjects;
  res.send(data)
})

const proofRouter = Router()

proofRouter.get('/outgoing', (req, res, next) => {
  const data = StateManager.instance.outgoingProofRequests;
  res.send(data)
})

proofRouter.get('/incoming', (req, res, next) => {
  const data = StateManager.instance.incomingProofRequests;
  res.send(data)
})

router.use('/proofs', proofRouter)

// INITIALISATION CALLS

router.post('/generateDID', (req, res, next) => {
  Initialisation.instance.generateDID$().subscribe({
    next: data => res.send(data),
    error: err => next(err)
  })
})

router.post('/fullInitialisation', (req, res, next) => {
  Initialisation.instance.fullInitialisation$(req.body).subscribe({
    next: () => res.send({}),
    error: err => next(err)
  })
})

router.post('/initialise', (req, res, next) => {
  Initialisation.instance.initialise$(req.body).subscribe({
    next: () => res.send({}),
    error: err => next(err)
  })
})

const didRouter = Router()

didRouter.post('/generate', (req, res, next) => {
  Initialisation.instance.generateDID$().subscribe({
    next: data => res.send(data),
    error: err => next(err)
  })
})

didRouter.post('/register', (req, res, next) => {
  Initialisation.instance.registerDID$(req.body).subscribe({
    next: () => res.send({}),
    error: err => next(err)
  })
})

didRouter.post('/auto', (req, res, next) => {
  Initialisation.instance.autoRegisterDID$(req.body).subscribe({
    next: () => res.send({}),
    error: err => next(err)
  })
})

router.use('/did', didRouter)
