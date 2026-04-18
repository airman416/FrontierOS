import { components as tourComponents } from '@reactour/tour'
import { useTour } from '@reactour/tour'

/**
 * Reactour ties the X button to `disabledActions` (same as step `disableActions`), so the close
 * control is disabled whenever we lock prev/next on a step. Always closing matches user expectation.
 */
export function TourCloseButton(props: React.ComponentProps<typeof tourComponents.Close>) {
  const { setIsOpen } = useTour()
  return (
    <tourComponents.Close
      {...props}
      disabled={false}
      onClick={() => setIsOpen(false)}
    />
  )
}
