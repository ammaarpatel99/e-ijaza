import {Router} from "express";
import {router as configRouter} from './config'

export const router = Router()

router.use('/config', configRouter)
