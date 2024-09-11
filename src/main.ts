import { Hono } from 'hono'
import { logger } from 'hono/logger'
import { PORT } from './config'
import eventsRoute from './events.route'

const app = new Hono()
app.use(logger())

app.get('/', (c) => {
  return c.json({ message: 'OK' })
})

app.route('/events', eventsRoute)
export default {
  port: +PORT,
  fetch: app.fetch,
}
