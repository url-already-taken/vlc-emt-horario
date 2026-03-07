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
    <form onSubmit={handleSubmit} className="mb-3 flex gap-2">
      <Input
        type="text"
        placeholder="Busca por calle o código..."
        value={query}
        onChange={(e) => onQueryChange(e.target.value)}
        className="h-10 w-full rounded-xl border-slate-200 bg-white/90 shadow-sm placeholder:text-slate-400"
        aria-label="Buscar parada por nombre o código"
      />
      <Button type="submit" variant="outline" className="hidden rounded-xl border-slate-200 bg-white/90 sm:inline-flex">
        Buscar
      </Button>
    </form>
  )
}
