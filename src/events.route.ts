import { Hono } from 'hono'
import { connect, headers } from 'nats'
import { NATS_SERVERS, NATS_TOKEN } from './config'

const app = new Hono()

app.post('/:companyId', async (c) => {
  const now = new Date()
  try {
    const companyId = c.req.param('companyId')
    if (!companyId) {
      return c.json({ message: 'Missing companyId' }, 400)
    }

    const formData = await c.req.formData()

    const eventLogText = formData.get('event_log') as string
    if (!eventLogText) {
      return c.json({ message: 'Missing event_log' })
    }

    const eventLog = JSON.parse(eventLogText)
    if (!eventLog.AccessControllerEvent.employeeNoString) {
      return c.json({ message: 'Ignored event' })
    }

    const pictureFile = formData.get('Picture') as File
    if (!pictureFile) {
      return c.json({ message: 'Missing Picture data' })
    }

    const nc = await connect({
      servers: NATS_SERVERS,
      token: NATS_TOKEN,
    })

    const js = nc.jetstream()

    const hdrs = headers()
    hdrs.set('Company-ID', companyId.toLowerCase())
    hdrs.set('Event-DateTime', eventLog.dateTime)
    hdrs.set(
      'Event-EmployeeNoString',
      eventLog.AccessControllerEvent.employeeNoString,
    )
    hdrs.set('Event-DeviceName', eventLog.AccessControllerEvent.deviceName)
    hdrs.set('Request-DateTime', now.toISOString())

    await js.publish(
      'events.hikvision_face_verified',
      Buffer.from(await pictureFile.arrayBuffer()),
      { headers: hdrs },
    )

    nc.close()

    return c.json({ message: 'OK' })
  } catch (error) {
    console.error('Error handling request:', error)
    return c.json({ error: 'Failed to process event' }, 500)
  }
})

export default app
