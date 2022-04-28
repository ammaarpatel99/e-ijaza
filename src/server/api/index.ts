import {Router} from "express";
import {router as stateRouter} from './state'
import {router as actionsRouter} from './actions'

export const router = Router()

router.use('/state', stateRouter)
router.use(actionsRouter)
