/**
 * The creator's Look panel (the Sims' Create-a-Sim): preset faces, then Face, Hair, Body and
 * Clothes, each a set of sliders, swatches and part pickers. Every change rebuilds the turntable.
 */
import { memo, useMemo, useState } from 'react'
import {
  BROW_STYLES,
  CLOTHES_COLOURS,
  EYE_COLOURS,
  FACIAL_HAIR,
  GLASSES,
  HAIR_COLOUR_NAMES,
  HAIR_COLOURS,
  HAIR_STYLES,
  OUTFITS,
  SKIN_TONES,
  type Appearance,
  type BrowStyle,
  type FacialHair,
  type Glasses,
  type HairStyle,
  type Outfit,
} from '../../sim/character/appearance.ts'
import type { CharacterSpec } from '../../sim/character/create.ts'
import { AvatarImage } from '../avatar/Portrait.tsx'
import { useRig } from '../avatar/useRig.ts'
import { ShuffleIcon } from '../kit/icons.ts'
import { Button, Segmented, Slider, Swatches } from '../kit/index.ts'
import { sliderNumber } from './describe.ts'
import { Field, Section, Select } from './Field.tsx'
import { creatorStore, presetLooks, useCreator } from './store.ts'

type LookTab = 'face' | 'hair' | 'body' | 'clothes'
const LOOK_TABS: { key: LookTab; label: string }[] = [
  { key: 'face', label: 'Face' },
  { key: 'hair', label: 'Hair' },
  { key: 'body', label: 'Body' },
  { key: 'clothes', label: 'Clothes' },
]

const SKIN_NAMES = ['Very fair', 'Fair', 'Light', 'Light medium', 'Medium', 'Tan', 'Brown', 'Deep']
const EYE_NAMES = ['Dark brown', 'Brown', 'Hazel', 'Green', 'Blue', 'Grey']
const CLOTHES_NAMES = [
  'Navy',
  'Charcoal',
  'Black',
  'Grey',
  'White',
  'Sky blue',
  'Cream',
  'Burgundy',
  'Forest green',
  'Teal',
  'Plum',
  'Red',
  'Royal blue',
  'Pink',
]

const swatchesOf = (colours: readonly string[], names: readonly string[]) =>
  colours.map((colour, i) => ({ key: String(i), colour, name: names[i] ?? colour }))

const SKIN = swatchesOf(SKIN_TONES, SKIN_NAMES)
const EYES = swatchesOf(EYE_COLOURS, EYE_NAMES)
const HAIR = swatchesOf(HAIR_COLOURS, HAIR_COLOUR_NAMES)
const CLOTHES = swatchesOf(CLOTHES_COLOURS, CLOTHES_NAMES)

const edit = (fn: (a: Appearance) => void) => creatorStore.getState().editLook(fn)

/** A −1 … +1 face or body slider, shown as −10 … +10. */
function LookSlider({
  label,
  value,
  set,
  limit = 1,
}: {
  label: string
  value: number
  set: (a: Appearance, v: number) => void
  limit?: number
}) {
  return (
    <Slider
      label={label}
      min={-limit}
      max={limit}
      step={0.05}
      value={value}
      format={sliderNumber}
      onChange={(v) => edit((a) => set(a, v))}
    />
  )
}

type PresetFor = Pick<CharacterSpec, 'gender' | 'heritage' | 'age'>

function Preset({ who, look, index }: { who: PresetFor; look: Appearance; index: number }) {
  const rig = useRig({ name: '', appearance: look, age: who.age, gender: who.gender })
  return (
    <button
      type="button"
      className="preset"
      aria-label={`Preset face ${index + 1}`}
      onClick={() => edit((a) => Object.assign(a, structuredClone(look)))}
    >
      <AvatarImage rig={rig} className="preset__image" />
    </button>
  )
}

/** Re-renders only when the gender, roots or age change, not on every slider step. */
const Presets = memo(function Presets({ gender, heritage, age }: PresetFor) {
  const who = useMemo(() => ({ gender, heritage, age }), [gender, heritage, age])
  const looks = useMemo(() => presetLooks(who), [who])
  return (
    <div className="presets">
      {looks.map((look, i) => (
        <Preset key={i} who={who} look={look} index={i} />
      ))}
    </div>
  )
})

function Face({ a }: { a: Appearance }) {
  return (
    <>
      <Field as="div" label="Skin tone">
        <Swatches
          label="Skin tone"
          swatches={SKIN}
          value={String(a.skin)}
          onChange={(k) => edit((x) => void (x.skin = Number(k)))}
        />
      </Field>
      <Section title="Head">
        <LookSlider label="Width" value={a.head.width} set={(x, v) => (x.head.width = v)} />
        <LookSlider label="Jaw" value={a.head.jaw} limit={1.2} set={(x, v) => (x.head.jaw = v)} />
        <LookSlider label="Cheeks" value={a.head.cheeks} set={(x, v) => (x.head.cheeks = v)} />
        <LookSlider label="Chin" value={a.head.chin} set={(x, v) => (x.head.chin = v)} />
        <LookSlider label="Brow ridge" value={a.head.brow} set={(x, v) => (x.head.brow = v)} />
        <LookSlider label="Ears" value={a.ears.size} set={(x, v) => (x.ears.size = v)} />
      </Section>
      <Section title="Eyes and brows">
        <Field as="div" label="Eye colour">
          <Swatches
            label="Eye colour"
            swatches={EYES}
            value={String(a.eyes.colour)}
            onChange={(k) => edit((x) => void (x.eyes.colour = Number(k)))}
          />
        </Field>
        <LookSlider label="Eye size" value={a.eyes.size} set={(x, v) => (x.eyes.size = v)} />
        <LookSlider
          label="Eye spacing"
          value={a.eyes.spacing}
          set={(x, v) => (x.eyes.spacing = v)}
        />
        <Field label="Brows">
          <Select<BrowStyle>
            value={a.brows.style}
            options={BROW_STYLES.map((b) => ({ value: b.id, label: b.label }))}
            onChange={(style) => edit((x) => void (x.brows.style = style))}
          />
        </Field>
        <LookSlider
          label="Brow weight"
          value={a.brows.thickness}
          set={(x, v) => (x.brows.thickness = v)}
        />
      </Section>
      <Section title="Nose and mouth">
        <LookSlider label="Nose size" value={a.nose.size} set={(x, v) => (x.nose.size = v)} />
        <LookSlider label="Nose width" value={a.nose.width} set={(x, v) => (x.nose.width = v)} />
        <LookSlider label="Mouth width" value={a.mouth.width} set={(x, v) => (x.mouth.width = v)} />
        <LookSlider label="Lips" value={a.mouth.lips} set={(x, v) => (x.mouth.lips = v)} />
      </Section>
    </>
  )
}

function Hair({ a }: { a: Appearance }) {
  return (
    <>
      <Field label="Hairstyle">
        <Select<HairStyle>
          value={a.hair.style}
          options={HAIR_STYLES.map((h) => ({ value: h.id, label: h.label }))}
          onChange={(style) => edit((x) => void (x.hair.style = style))}
        />
      </Field>
      <Field as="div" label="Hair colour">
        <Swatches
          label="Hair colour"
          swatches={HAIR}
          value={String(a.hair.colour)}
          onChange={(k) => edit((x) => void (x.hair.colour = Number(k)))}
        />
      </Field>
      <Field label="Facial hair">
        <Select<FacialHair>
          value={a.facialHair}
          options={FACIAL_HAIR.map((h) => ({ value: h.id, label: h.label }))}
          onChange={(v) => edit((x) => void (x.facialHair = v))}
        />
      </Field>
      <Section title="With age">
        <Slider
          label="Greys from"
          min={25}
          max={70}
          value={a.ageing.greyAt}
          format={(v) => v}
          onChange={(v) => edit((x) => void (x.ageing.greyAt = v))}
        />
        <Slider
          label="Hairline"
          min={0}
          max={1}
          step={0.05}
          value={a.ageing.recede}
          format={(v) => (v < 0.25 ? 'Holds' : v < 0.65 ? 'Thins' : 'Recedes')}
          onChange={(v) => edit((x) => void (x.ageing.recede = v))}
        />
      </Section>
    </>
  )
}

function Body({ a }: { a: Appearance }) {
  return (
    <>
      <LookSlider label="Height" value={a.body.height} set={(x, v) => (x.body.height = v)} />
      <LookSlider label="Build" value={a.body.build} set={(x, v) => (x.body.build = v)} />
    </>
  )
}

function Clothes({ a }: { a: Appearance }) {
  return (
    <>
      <Field label="Outfit">
        <Select<Outfit>
          value={a.outfit}
          options={OUTFITS.filter((o) => o.id !== 'school').map((o) => ({
            value: o.id,
            label: o.label,
          }))}
          onChange={(outfit) => edit((x) => void (x.outfit = outfit))}
        />
      </Field>
      <Field as="div" label="Main colour">
        <Swatches
          label="Main colour"
          swatches={CLOTHES}
          value={String(a.clothes.main)}
          onChange={(k) => edit((x) => void (x.clothes.main = Number(k)))}
        />
      </Field>
      <Field as="div" label="Second colour">
        <Swatches
          label="Second colour"
          swatches={CLOTHES}
          value={String(a.clothes.accent)}
          onChange={(k) => edit((x) => void (x.clothes.accent = Number(k)))}
        />
      </Field>
      <Field label="Glasses">
        <Select<Glasses>
          value={a.glasses}
          options={GLASSES.map((g) => ({ value: g.id, label: g.label }))}
          onChange={(glasses) => edit((x) => void (x.glasses = glasses))}
        />
      </Field>
    </>
  )
}

export function LookPanel() {
  const spec = useCreator((s) => s.spec)
  const [tab, setTab] = useState<LookTab>('face')
  const a = spec.appearance
  return (
    <>
      <Section
        title="Presets"
        actions={
          <Button
            size="s"
            variant="quiet"
            icon={ShuffleIcon}
            onClick={() => creatorStore.getState().randomise('look')}
          >
            Randomise
          </Button>
        }
      >
        <Presets gender={spec.gender} heritage={spec.heritage} age={spec.age} />
      </Section>
      <Segmented<LookTab>
        label="Part"
        className="look-tabs"
        items={LOOK_TABS}
        value={tab}
        onChange={setTab}
      />
      <div className="look-body">
        {tab === 'face' && <Face a={a} />}
        {tab === 'hair' && <Hair a={a} />}
        {tab === 'body' && <Body a={a} />}
        {tab === 'clothes' && <Clothes a={a} />}
      </div>
    </>
  )
}
