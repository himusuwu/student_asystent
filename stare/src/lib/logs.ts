type Listener = (msg: string) => void
const listeners: Listener[] = []
let buffer: string[] = []

export function log(msg: string) {
  const line = `[${new Date().toLocaleTimeString()}] ${msg}`
  buffer.push(line)
  if (buffer.length > 500) buffer = buffer.slice(-500)
  listeners.forEach(fn => {
    try { fn(line) } catch {}
  })
}

export function getLogs() {
  return buffer.slice(-500)
}

export function clearLogs() {
  buffer = []
}

export function subscribe(fn: Listener) {
  listeners.push(fn)
  return () => {
    const i = listeners.indexOf(fn)
    if (i >= 0) listeners.splice(i, 1)
  }
}
