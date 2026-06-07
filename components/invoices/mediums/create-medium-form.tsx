"use client"

import {
  ContentSwitcher,
  MediumFormLabel,
  MediumSectionDivider,
  MediumSectionTitle,
  NumberStepperInput,
  SafeAreaPadding,
} from "@/components/invoices/mediums/medium-form-fields"
import {
  applyOrientation,
  applyPaperPreset,
  DEFAULT_MEDIUM_FORM,
  isCustomPaperSize,
  RESOLUTION_OPTIONS,
  type MediumFormState,
  type MediumOrientation,
  type MediumResolution,
  type PaperSize,
} from "@/lib/medium-form"

type CreateMediumFormProps = {
  state: MediumFormState
  onChange: (next: MediumFormState) => void
}

export function CreateMediumForm({ state, onChange }: CreateMediumFormProps) {
  const isCustomPaper = isCustomPaperSize(state.paperSize)

  return (
    <form
      className="flex w-full flex-col gap-6"
      onSubmit={(event) => event.preventDefault()}
    >
      <section className="flex flex-col gap-4">
        <MediumSectionTitle>Paper</MediumSectionTitle>

        <div className="flex gap-4">
          <div className="flex min-w-0 flex-1 flex-col gap-1">
            <MediumFormLabel htmlFor="paper-size">Paper size</MediumFormLabel>
            <ContentSwitcher<PaperSize>
              ariaLabel="Paper size"
              value={state.paperSize}
              onChange={(paperSize) => onChange(applyPaperPreset(state, paperSize))}
              options={[
                { value: "A4", label: "A4" },
                { value: "US letter", label: "US letter" },
                { value: "Custom", label: "Custom" },
              ]}
            />
          </div>

          <div className="flex min-w-0 flex-1 flex-col gap-1">
            <MediumFormLabel htmlFor="orientation">Orientation</MediumFormLabel>
            <ContentSwitcher<MediumOrientation>
              ariaLabel="Orientation"
              value={state.orientation}
              onChange={(orientation) => onChange(applyOrientation(state, orientation))}
              options={[
                { value: "Portrait", label: "Portrait" },
                { value: "Landscape", label: "Landscape" },
              ]}
            />
          </div>
        </div>

        <div className="flex gap-4">
          <NumberStepperInput
            id="medium-width"
            label="Width"
            value={state.width}
            min={1}
            readOnly={!isCustomPaper}
            onChange={(width) => onChange({ ...state, width, paperSize: "Custom" })}
          />
          <NumberStepperInput
            id="medium-height"
            label="Height"
            value={state.height}
            min={1}
            readOnly={!isCustomPaper}
            onChange={(height) => onChange({ ...state, height, paperSize: "Custom" })}
          />
        </div>
      </section>

      <MediumSectionDivider />

      <section className="flex flex-col gap-4">
        <MediumSectionTitle>Safe area</MediumSectionTitle>
        <SafeAreaPadding
          value={state.safeArea}
          onChange={(safeArea) => onChange({ ...state, safeArea })}
        />
      </section>

      <MediumSectionDivider />

      <section className="flex flex-col gap-4">
        <MediumSectionTitle>Output</MediumSectionTitle>

        <div className="flex flex-col gap-1">
          <MediumFormLabel htmlFor="resolution">Resolution</MediumFormLabel>
          <ContentSwitcher<MediumResolution>
            ariaLabel="Resolution"
            value={state.resolution}
            onChange={(resolution) => onChange({ ...state, resolution })}
            options={RESOLUTION_OPTIONS.map((option) => ({
              value: option.value,
              label: option.label,
            }))}
          />
        </div>
      </section>
    </form>
  )
}

export { DEFAULT_MEDIUM_FORM }
