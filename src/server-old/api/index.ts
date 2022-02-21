import {Router} from 'express'
import {router as configRouter} from './config'
import {router as credRouter} from './cred'

export const router = Router()
router.use('/cred', credRouter)
router.use('/config', configRouter)
