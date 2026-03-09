export const FAVORITES_STORAGE_KEY = "bus-stop-favorites"

export type FavoriteStopsMap = Record<string, boolean>

export function readFavoriteStops(): FavoriteStopsMap {
  if (typeof window === "undefined") return {}

  try {
    const stored = window.localStorage.getItem(FAVORITES_STORAGE_KEY)
    if (!stored) return {}

    const parsed = JSON.parse(stored) as unknown
    if (!parsed || typeof parsed !== "object" || Array.isArray(parsed)) {
      return {}
    }

    return Object.entries(parsed).reduce<FavoriteStopsMap>((result, [stopId, value]) => {
      if (value === true) {
        result[stopId] = true
      }
      return result
    }, {})
  } catch (err) {
    console.warn("No se pudieron leer los favoritos guardados:", err)
    return {}
  }
}

export function writeFavoriteStops(favorites: FavoriteStopsMap) {
  if (typeof window === "undefined") return

  try {
    window.localStorage.setItem(FAVORITES_STORAGE_KEY, JSON.stringify(favorites))
  } catch (err) {
    console.warn("No se pudieron guardar los favoritos:", err)
  }
}
