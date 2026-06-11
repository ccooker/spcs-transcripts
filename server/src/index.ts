import 'dotenv/config'
import { app } from './app.js'

const port = parseInt(process.env.PORT ?? '3001', 10)

app.listen(port, () => {
  console.log(`SPCS API listening on port ${port}`)
})
