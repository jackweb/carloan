/** The backend's `detail` message if it sent one, else a generic message. */
export async function errorMessage(res: Response, what: string): Promise<string> {
  try {
    const { detail } = (await res.json()) as { detail?: unknown }
    if (typeof detail === 'string') return detail
  } catch {
    // Not JSON; fall through.
  }
  return `${what} failed: ${res.status}`
}
