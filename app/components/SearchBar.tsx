import { useState } from "react"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"

interface SearchBarProps {
  onSearch: (query: string) => void
  onUseMyLocation: () => void
}

export default function SearchBar({ onSearch, onUseMyLocation }: SearchBarProps) {
  const [query, setQuery] = useState("")

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault()
    onSearch(query)
  }

  return (
    <form onSubmit={handleSubmit} className="flex gap-2 mb-4">
      <Input
        type="text"
        placeholder="Enter location..."
        value={query}
        onChange={(e) => setQuery(e.target.value)}
        className="flex-grow"
      />
      <Button type="submit">Search</Button>
      <Button type="button" onClick={onUseMyLocation} variant="outline">
        Use My Location
      </Button>
    </form>
  )
}

