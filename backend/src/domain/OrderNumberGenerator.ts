import { Effect } from 'effect'

export const generateOrderNumber = (): Effect.Effect<string> =>
  Effect.sync(() => {
    const date = new Date()
    const year = date.getFullYear()
    const month = String(date.getMonth() + 1).padStart(2, '0')
    const day = String(date.getDate()).padStart(2, '0')
    const timestamp = Date.now().toString().slice(-6)

    return `ORD-${year}${month}${day}-${timestamp}`
  })
