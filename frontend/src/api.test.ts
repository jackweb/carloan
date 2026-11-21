import { describe, expect, it } from 'vitest'
import { errorMessage } from './api'

const json = (body: unknown, status: number) =>
  new Response(JSON.stringify(body), { status, headers: { 'Content-Type': 'application/json' } })

describe('errorMessage', () => {
  it("uses the backend's detail message", async () => {
    const res = json({ detail: "Parts can't be changed while the order is funded" }, 409)
    expect(await errorMessage(res, 'PUT /order/{id}/parts')).toBe(
      "Parts can't be changed while the order is funded",
    )
  })

  it('falls back when detail is not a string (FastAPI validation errors)', async () => {
    const res = json({ detail: [{ loc: ['body', 'years'], msg: 'too large' }] }, 422)
    expect(await errorMessage(res, 'POST /order/{id}/loan')).toBe(
      'POST /order/{id}/loan failed: 422',
    )
  })

  it('falls back when there is no detail', async () => {
    expect(await errorMessage(json({}, 404), 'GET /x')).toBe('GET /x failed: 404')
  })

  it('falls back when the body is not JSON', async () => {
    const res = new Response('Internal Server Error', { status: 500 })
    expect(await errorMessage(res, 'GET /x')).toBe('GET /x failed: 500')
  })

  it('falls back when the body is empty', async () => {
    expect(await errorMessage(new Response(null, { status: 502 }), 'GET /x')).toBe(
      'GET /x failed: 502',
    )
  })
})
