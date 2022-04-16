import {Router} from "express";
import {router as stateRouter} from './state'

export const router = Router()

router.use('/state', stateRouter)
