import { Button } from "@/components/ui/button"

interface SortToggleProps {
  sortBy: "nearest" | "soonest"
  onSortChange: (sortBy: "nearest" | "soonest") => void
}

export default function SortToggle({ sortBy, onSortChange }: SortToggleProps) {
  return (
    <div className="flex gap-2 mb-4">
      <Button onClick={() => onSortChange("nearest")} variant={sortBy === "nearest" ? "default" : "outline"}>
        Nearest
      </Button>
      <Button onClick={() => onSortChange("soonest")} variant={sortBy === "soonest" ? "default" : "outline"}>
        Soonest
      </Button>
    </div>
  )
}

