import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"

interface SearchBarProps {
  query: string
  onQueryChange: (value: string) => void
  onSearch: (query: string) => void
}

export default function SearchBar({ query, onQueryChange, onSearch }: SearchBarProps) {
  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault()
    onSearch(query)
  }

  return (
    <form onSubmit={handleSubmit} className="flex gap-2 mb-2">
      <Input
        type="text"
        placeholder="Busca por calle o código..."
        value={query}
        onChange={(e) => onQueryChange(e.target.value)}
        className="w-full bg-white"
        aria-label="Buscar parada por nombre o código"
      />
      <Button type="submit" variant="outline" className="hidden sm:inline-flex">Buscar</Button>
    </form>
  )
}
