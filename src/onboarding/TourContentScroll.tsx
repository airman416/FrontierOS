import type { ComponentProps } from 'react'
import { components as tourComponents } from '@reactour/tour'

/**
 * Scroll long step text inside this wrapper so the outer popover can stay `overflow: visible`.
 * That lets Reactour’s default badge sit slightly above the corner without being clipped.
 */
export function TourContentScroll(props: ComponentProps<typeof tourComponents.Content>) {
  return (
    <div
      className="min-h-0 whitespace-pre-line"
      style={{
        maxHeight: 'min(70dvh, 520px)',
        overflowY: 'auto',
      }}
    >
      <tourComponents.Content {...props} />
    </div>
  )
}
