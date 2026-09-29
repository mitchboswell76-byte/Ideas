import { PixelText } from './PixelArt.tsx'

/** Top-left brand: pixel monogram in an outline box, name stacked beside it. */
export function BrandBlock() {
  return (
    <div className="brand">
      <span className="brand__mark">
        <PixelText text="M" scale={3} label="" />
      </span>
      <span className="brand__name">
        <span className="brand__title">Mandate</span>
        <span className="brand__sub">Est. 2026</span>
      </span>
    </div>
  )
}
