import {Router} from "express";
import {router as configRouter} from './config'
import {router as masterRouter} from './master'
import {router as userRouter} from './user'

export const router = Router()

router.use('/config', configRouter)
router.use('/master', masterRouter)
router.use('/user', userRouter)
