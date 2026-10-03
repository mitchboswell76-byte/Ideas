import { ArrowsInSimpleIcon, ArrowsOutSimpleIcon } from '../kit/icons.ts'
import { Button } from '../kit/index.ts'
import { mapOnlyStore, useMapOnly } from '../store/map.ts'

/**
 * Hides the key and the place list so the map has the whole screen (both maps share the setting).
 * Picking a place still opens its card; closing it goes back to the map alone.
 */
export function MapOnlyToggle() {
  const { mapOnly } = useMapOnly()
  return (
    <Button
      size="s"
      variant="quiet"
      icon={mapOnly ? ArrowsInSimpleIcon : ArrowsOutSimpleIcon}
      aria-pressed={mapOnly}
      title={mapOnly ? 'Show the key and the list again' : 'Hide the key and the list'}
      onClick={() => mapOnlyStore.getState().setMapOnly(!mapOnly)}
    >
      {mapOnly ? 'Show key' : 'Map only'}
    </Button>
  )
}
