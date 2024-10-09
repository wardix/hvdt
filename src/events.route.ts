import { Hono } from 'hono'
import { connect, headers } from 'nats'
import path from 'path'
import { readFile } from 'fs/promises'
import { DEFAULT_PICTURE_FILE, NATS_SERVERS, NATS_TOKEN } from './config'

const app = new Hono()

async function handleEvent(c: any, topic: string) {
  const now = new Date()

  let nc = null

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

    let eventLog
    try {
      eventLog = JSON.parse(eventLogText)
    } catch {
      return c.json({ message: 'Invalid event_log format' })
    }

    if (!eventLog.AccessControllerEvent?.employeeNoString) {
      return c.json({ message: 'Ignored event, missing employeeNoString' })
    }

    let pictureFile = formData.get('Picture') as File
    if (!pictureFile) {
      const picturePath = path.resolve(DEFAULT_PICTURE_FILE)
      const pictureBuffer = await readFile(picturePath)
      pictureFile = new File([pictureBuffer], 'picture.jpg', {
        type: 'image/jpeg',
      })
    }

    nc = await connect({ servers: NATS_SERVERS, token: NATS_TOKEN })
    const js = nc.jetstream()

    const hdrs = headers()
    hdrs.set('Company-ID', companyId.toLowerCase())
    hdrs.set('Event-DateTime', eventLog.dateTime)
    hdrs.set(
      'Event-EmployeeNoString',
      eventLog.AccessControllerEvent.employeeNoString,
    )
    hdrs.set('Event-DeviceName', eventLog.AccessControllerEvent.deviceName)
    hdrs.set(
      'Event-MajorEventType',
      `${eventLog.AccessControllerEvent.majorEventType}`,
    )
    hdrs.set(
      'Event-SubEventType',
      `${eventLog.AccessControllerEvent.subEventType}`,
    )
    hdrs.set('Request-DateTime', now.toISOString())

    await js.publish(topic, Buffer.from(await pictureFile.arrayBuffer()), {
      headers: hdrs,
    })

    return c.json({ message: 'OK' })
  } catch (error) {
    console.error('Error handling request:', error)
    return c.json({ error: 'Failed to process event' }, 500)
  } finally {
    if (nc) {
      nc.close()
    }
  }
}

app.post('/:companyId', (c) =>
  handleEvent(c, 'events.hikvision_access_verified'),
)

app.post('/shared/:companyId', (c) =>
  handleEvent(c, 'events.shared_hikvision_access_verified'),
)

export default app
