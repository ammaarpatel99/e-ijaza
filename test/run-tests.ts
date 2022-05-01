import {Controller} from "./controller";
import {User} from "./user";
import {asyncTimout} from '../src/utils'
import {Verifier} from "./verifier";
import {OntologyCreator} from "./ontology-creator";


import {testData} from './ijaza-data'


const verifierRuns = [1]
const numOfRepeats = 1


function createAgents() {
  const controller = new Controller()
  const ontologyCreator = new OntologyCreator()
  const verifiers = Array.from({length: Math.max(...verifierRuns)}, (v, i) => i)
    .map(id => new Verifier(id))
  const users = testData.users.map(name => new User(name))
  return {controller, ontologyCreator, verifiers, users}
}

async function setup(controller: Controller, ontologyCreator: OntologyCreator, verifiers: Verifier[], users: User[]) {
  console.log(`starting applications`);
  [controller, ontologyCreator, ...users, ...verifiers].forEach(wrapper => wrapper.startApplication())
  console.log('started applications')
  await asyncTimout(5000)

  console.log(`initialising controller`)
  await controller.initialise()
  console.log('initialised controller')
  await asyncTimout(5000)

  console.log(`initialising ontology creator agent`)
  await ontologyCreator.initialise(controller.did)
  console.log('initialised ontology creator agent')
  await asyncTimout(5000)

  console.log('issue master cred to ontology creator')
  await controller.issueFirstMasterCred(ontologyCreator.did)
  console.log('issued master cred')
  await asyncTimout(5000)

  console.log(`acting on ontology commands`)
  for (const proposal of testData.ontologyCommands) {
    await ontologyCreator.makeProposal(proposal)
    console.log(`acted on ontology command`)
    await asyncTimout(5000)
  }
  console.log('acted on all ontology commands')

  console.log(`initialising all other applications`)
  await Promise.all(
    [...users, ...verifiers]
      .map(appWrapper => appWrapper.initialise(controller.did))
  )
  console.log(`initialised all applications`)
  await asyncTimout(5000)

  console.log(`create initial master`)
  const masterDID = users.filter(user => user.name === testData.master.name).map(user => user.did).shift()
  if (!masterDID) throw new Error(`tried to issue initial master but ${testData.master.subject} doesn't exist`)
  await ontologyCreator.issueMaster(masterDID, testData.master.subject)
  console.log(`issued initial master`)
  await asyncTimout(5000)

  console.log(`issuing credentials`)
  for (const cred of testData.issueCreds) {
    const issuer = users.filter(user => user.name === cred.issuer).shift()
    const receiver = users.filter(user => user.name === cred.receiver).shift()
    if (!issuer || !receiver) throw new Error(`issuing cred ${issuer}->${receiver} but the issuer or receiver doesn't exist`)
    await issuer.issueCred(receiver.did, cred.subject)
    console.log(`issued credential`)
    await asyncTimout(5000)
  }
  console.log(`issued all credentials`)

  console.log(`making credentials public`)
  await Promise.all(users.map(user => user.makeCredsPublic()))
  console.log(`made credentials public`)
  await asyncTimout(5000)
}

async function runVerifiers(verifiers: Verifier[], users: User[]) {
  console.log(`running proof requests`)
  const user = users.filter(user => user.name === testData.test.user).shift()
  if (!user) throw new Error(`can't run test as user doesn't exist`)
  await Promise.all(verifiers.map(verifier => verifier.runProof(user.did, testData.test.subject)))
  console.log(`ran all proofs`)
  await asyncTimout(5000)
}

async function runTests() {
  const {controller, ontologyCreator, verifiers, users} = createAgents()
  await setup(controller, ontologyCreator, verifiers, users)
  for (let i = 0; i < numOfRepeats; i++) {
    for (const verifyNum of verifierRuns) {
      await runVerifiers(verifiers.slice(0,verifyNum), users)
      await asyncTimout(1000 * 60 * 3)
    }
  }
}



runTests().then(() => console.log(`completed all tests`))
