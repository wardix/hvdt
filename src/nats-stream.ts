import { connect, RetentionPolicy } from 'nats'
import { NATS_SERVERS, NATS_TOKEN } from './config'

const nc = await connect({
  servers: NATS_SERVERS,
  token: NATS_TOKEN,
})
const js = nc.jetstream()
const jsm = await js.jetstreamManager()

await jsm.streams.add({
  name: 'EVENTS',
  retention: RetentionPolicy.Interest,
  subjects: ['events.>'],
})

await nc.close()
