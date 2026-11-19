/** Response of GET /order/{id}/quote. */
export type Quote = {
  id: string
  state: string
  base_price: number
  model: string
  model_price: number
  parts: { slot: string; id: string; price: number }[]
  total: number
}

const usd = new Intl.NumberFormat('en-US', {
  style: 'currency',
  currency: 'USD',
  maximumFractionDigits: 0,
})

type Props = {
  quote: Quote | null
}

function QuoteSummary({ quote }: Props) {
  if (!quote) return <p className="text-gray-500">No quote yet.</p>

  return (
    <div className="inline-flex flex-col items-stretch gap-2 text-left">
      <p className="text-center">
        Estimated quote:{' '}
        <span className="font-semibold">{usd.format(quote.total)}</span>
      </p>
      <table className="text-sm">
        <tbody>
          <tr>
            <td className="pr-4 text-gray-500">base price</td>
            <td />
            <td className="text-right">{usd.format(quote.base_price)}</td>
          </tr>
          <tr>
            <td className="pr-4 text-gray-500">model</td>
            <td className="pr-4 font-medium">{quote.model}</td>
            <td className="text-right">+{usd.format(quote.model_price)}</td>
          </tr>
          {quote.parts.map((p) => (
            <tr key={p.slot}>
              <td className="pr-4 text-gray-500">{p.slot}</td>
              <td className="pr-4 font-medium">{p.id}</td>
              <td className="text-right">+{usd.format(p.price)}</td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  )
}

export default QuoteSummary
