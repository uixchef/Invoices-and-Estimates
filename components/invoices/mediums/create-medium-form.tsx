"use client"

import {
  ContentSwitcher,
  FormSectionDivider,
  MediumFormLabel,
  NumberStepperInput,
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

  const updateSafeArea = (
    side: keyof MediumFormState["safeArea"],
    value: number
  ) => {
    onChange({
      ...state,
      safeArea: { ...state.safeArea, [side]: value },
    })
  }

  return (
    <form
      className="flex min-w-0 flex-col gap-8"
      onSubmit={(event) => event.preventDefault()}
    >
      <section className="flex flex-col gap-4">
        <FormSectionDivider label="Paper" />

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

      <section className="flex flex-col gap-4">
        <FormSectionDivider label="Safe area" />

        <div className="grid grid-cols-2 gap-4 sm:grid-cols-4">
          <NumberStepperInput
            id="safe-top"
            label="Top"
            value={state.safeArea.top}
            onChange={(top) => updateSafeArea("top", top)}
          />
          <NumberStepperInput
            id="safe-right"
            label="Right"
            value={state.safeArea.right}
            onChange={(right) => updateSafeArea("right", right)}
          />
          <NumberStepperInput
            id="safe-bottom"
            label="Bottom"
            value={state.safeArea.bottom}
            onChange={(bottom) => updateSafeArea("bottom", bottom)}
          />
          <NumberStepperInput
            id="safe-left"
            label="Left"
            value={state.safeArea.left}
            onChange={(left) => updateSafeArea("left", left)}
          />
        </div>
      </section>

      <section className="flex flex-col gap-4">
        <FormSectionDivider label="Output" />

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
