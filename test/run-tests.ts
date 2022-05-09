import {Controller} from "./controller";
import {User} from "./user";
import {asyncTimout} from '../src/utils'
import {Verifier} from "./verifier";
import {OntologyCreator} from "./ontology-creator";


import {testData} from './ijaza-data'
import {ApplicationWrapper} from "./application-wrapper";
import {ProofResultLogger} from "./proof-result-logger";
import {SubjectProposalType} from "../src/types/schemas";


const verifierRuns = [1,4,7,10]
const numOfRepeats = 3

function processTestData() {
  testData.users = testData.users.map(txt => txt.replace(/ /gi, '_'))
  testData.ontologyCommands = testData.ontologyCommands.map(command => ({
    proposalType: command.proposalType,
    subject: command.subject.replace(/ /gi, '_'),
    change: command.change.type === SubjectProposalType.CHILD
      ? {...command.change, child: command.change.child.replace(/ /gi, '_')}
      : {...command.change, componentSet: command.change.componentSet.map(txt => txt.replace(/ /gi, '_'))}
  }))
  testData.master.name = testData.master.name.replace(/ /gi, '_')
  testData.master.subject = testData.master.subject.replace(/ /gi, '_')
  testData.issueCreds = testData.issueCreds.map(issue => ({
    subject: issue.subject.replace(/ /gi, '_'),
    issuer: issue.issuer.replace(/ /gi, '_'),
    receiver: issue.receiver.replace(/ /gi, '_')
  }))
  testData.test.user = testData.test.user.replace(/ /gi, '_')
  testData.test.subject = testData.test.subject.replace(/ /gi, '_')
}

function createAgents() {
  const controller = new Controller()
  const ontologyCreator = new OntologyCreator()
  const verifiers = Array.from({length: Math.max(...verifierRuns)}, (v, i) => i)
    .map(id => new Verifier(id))
  const users = testData.users.map(name => new User(name))
  return {controller, ontologyCreator, verifiers, users}
}

async function setup(controller: Controller, ontologyCreator: OntologyCreator, verifiers: Verifier[], users: User[]) {
  console.log('starting controller')
  controller.startApplication()
  console.log('started controller')
  await asyncTimout(60 * 1000)
  console.log(`initialising controller`)
  await controller.initialise()
  console.log('initialised controller')
  await asyncTimout(60 * 1000)

  console.log('starting ontology creator')
  ontologyCreator.startApplication()
  console.log('started ontology creator')
  await asyncTimout(60 * 1000)
  console.log(`initialising ontology creator agent`)
  await ontologyCreator.initialise(controller.did)
  console.log('initialised ontology creator agent')
  await asyncTimout(60 * 1000)

  console.log('issue master cred to ontology creator')
  await controller.issueFirstMasterCred(ontologyCreator.did)
  console.log('issued master cred')
  await asyncTimout(30 * 1000)

  console.log(`acting on ontology commands`)
  for (const proposal of testData.ontologyCommands) {
    await ontologyCreator.makeProposal(proposal)
    console.log(`acted on ontology command`)
    await asyncTimout(20 * 1000)
  }
  console.log('acted on all ontology commands')
  await asyncTimout(60 * 1000)

  console.log(`create initial master`)
  const firstMaster = users.filter(user => user.rawName === testData.master.name).shift()
  if (!firstMaster) throw new Error(`tried to issue create initial master but ${testData.master.name} doesn't exist`)
  console.log('starting initial master')
  firstMaster.startApplication()
  console.log('started initial master')
  await asyncTimout(60 * 1000)
  console.log(`initialising initial master`)
  await firstMaster.initialise(controller.did)
  console.log('initialised initial master')
  await asyncTimout(60 * 1000)
  console.log('issuing initial master credential')
  await ontologyCreator.issueMaster(firstMaster.did, testData.master.subject)
  console.log(`issued initial master credential`)
  await asyncTimout(60 * 1000)

  console.log(`starting all other applications`);
  [...users.filter(user => user !== firstMaster), ...verifiers].forEach(wrapper => wrapper.startApplication())
  console.log('started applications')
  await asyncTimout(4 * 60 * 1000)

  console.log(`initialising all other applications`)
  await Promise.all(
    [...users.filter(user => user !== firstMaster), ...verifiers]
      .map(appWrapper => appWrapper.initialise(controller.did))
  )
  console.log(`initialised all applications`)
  await asyncTimout(3 * 60 * 1000)

  console.log(`issuing credentials`)
  for (const cred of testData.issueCreds) {
    const issuer = users.filter(user => user.rawName === cred.issuer).shift()
    const receiver = users.filter(user => user.rawName === cred.receiver).shift()
    if (!issuer || !receiver) throw new Error(`issuing cred ${cred.issuer}->${cred.receiver} but the issuer or receiver doesn't exist`)
    await issuer.issueCred(receiver.did, cred.subject)
    console.log(`issued credential`)
    await asyncTimout(20 * 1000)
  }
  console.log(`issued all credentials`)
  await asyncTimout(60 * 1000)

  console.log(`making credentials public`)
  await Promise.all(users.map(user => user.makeCredsPublic()))
  console.log(`made credentials public`)
  await asyncTimout(60 * 1000)
}

async function runVerifiers(verifiers: Verifier[], users: User[]) {
  console.log(`running proof requests`)
  const user = users.filter(user => user.rawName === testData.test.user).shift()
  if (!user) throw new Error(`can't run test as user doesn't exist`)
  await Promise.all(verifiers.map(verifier => verifier.runProof(user.did, testData.test.subject)))
  console.log(`ran all proofs`)
}

async function cleanup(applications: ApplicationWrapper[]) {
  console.log(`stopping applications`)
  applications.map(app => app.stopApplication())
  await asyncTimout(3 * 60 * 1000)
  console.log('removing applications');
  applications.map(app => app.removeApplication())
  await asyncTimout(60 * 1000)
  console.log(`cleanup complete`)
}

async function runTests() {
  processTestData()
  const {controller, ontologyCreator, verifiers, users} = createAgents()
  await setup(controller, ontologyCreator, verifiers, users)
  ProofResultLogger.instance.instantiate([controller, ...users])
  for (let i = 0; i < numOfRepeats; i++) {
    for (const verifyNum of verifierRuns) {
      await runVerifiers(verifiers.slice(0,verifyNum), users)
      await asyncTimout(3 * 60 * 1000)
    }
    await asyncTimout(5 * 60 * 1000)
  }
  await cleanup([controller, ontologyCreator, ...verifiers, ...users])
  console.log(`completed all tests`)
}



//runTests()

processTestData()
const agents = createAgents()
cleanup([agents.controller, agents.ontologyCreator, ...agents.users, ...agents.verifiers])

// async function demo() {
//   console.log('here1')
//   processTestData()
//   console.log('here2')
//   const agents = createAgents()
//   console.log('here3')
//   agents.controller.startApplication()
//   console.log('here3')
//   agents.ontologyCreator.startApplication()
//   console.log('here4')
//   await asyncTimout(60 * 1000)
//   console.log('here5')
//   await agents.controller.initialise()
//   console.log('here6')
//   await asyncTimout(60 * 1000)
//   console.log('here7')
//   await agents.ontologyCreator.initialise(agents.controller.did)
//   console.log('here8')
//   await asyncTimout(60 * 1000)
//   console.log('here9')
// }
// demo()


