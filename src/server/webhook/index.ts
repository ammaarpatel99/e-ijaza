import {Router} from "express";

export const router = Router()
router.post('*', (req, res, next) => {
  res.sendStatus(200)
  console.log()
  console.log(req.url)
  console.log(req.body)
  console.log()
})
