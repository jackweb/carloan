import CarConfiguration from './components/CarConfiguration'

function App() {
  return (
    <main className="mx-auto flex min-h-screen max-w-3xl flex-col justify-center p-8">
      <h1 className="text-3xl font-bold [-webkit-text-stroke:2px_black] [paint-order:stroke_fill]">Car loan simulator</h1>
      <CarConfiguration />
    </main>
  )
}

export default App
