import Amplitude from 'amplitude-js'

const instance = Amplitude.getInstance();
instance.init('c666c8ed260d8e90cc5ac3f242c2fcae', null, {
  trackingOptions: {
    ip_address: false
  }
})

export function logEvent(type, properties = {}) {
  console.log(`[METRICS]: "${type}", ${JSON.stringify(properties)}`)
  // Override the IP so we don't collect it
  properties.ip = ''
  instance.logEvent(type, properties)
}
