"use client"

import { useState, type ReactNode } from "react"

import { HLIcon } from "@/components/highrise/icon"
import {
  Copy01Icon,
  EyeIcon,
  EyeOffIcon,
} from "@gohighlevel/ghl-icons/24/outline"
import { cn } from "@/lib/utils"

export function SettingsFormLabel({
  htmlFor,
  required,
  children,
}: {
  htmlFor: string
  required?: boolean
  children: ReactNode
}) {
  return (
    <label
      htmlFor={htmlFor}
      className="flex items-center gap-1 font-[family-name:var(--font-inter)] text-base font-medium leading-6 text-[#101828]"
    >
      <span>{children}</span>
      {required ? <span className="text-[#d92d20]">*</span> : null}
    </label>
  )
}

export function SettingsTextInput({
  id,
  type = "text",
  value,
  onChange,
  placeholder,
  readOnly = false,
}: {
  id: string
  type?: "text" | "password"
  value: string
  onChange: (next: string) => void
  placeholder: string
  readOnly?: boolean
}) {
  const inputType = readOnly ? "text" : type

  return (
    <div
      className={cn(
        "flex h-9 w-full items-center rounded border border-[#d0d5dd] px-2 shadow-[0_1px_2px_rgba(16,24,40,0.05)]",
        !readOnly &&
          "bg-white focus-within:border-[#84adff] focus-within:shadow-[0_0_0_4px_#eff4ff,0_1px_2px_rgba(16,24,40,0.05)]",
        readOnly && "bg-[#f9fafb]"
      )}
    >
      <input
        id={id}
        type={inputType}
        value={value}
        readOnly={readOnly}
        onChange={(event) => onChange(event.target.value)}
        placeholder={placeholder}
        className={cn(
          "min-w-0 flex-1 bg-transparent font-[family-name:var(--font-inter)] text-base leading-6 outline-none placeholder:text-[#667085]",
          readOnly ? "cursor-default text-[#98a2b3]" : "text-[#101828]"
        )}
      />
    </div>
  )
}

export function TrailingIconButton({
  ariaLabel,
  onClick,
  disabled = false,
  children,
}: {
  ariaLabel: string
  onClick: () => void
  disabled?: boolean
  children: ReactNode
}) {
  return (
    <button
      type="button"
      aria-label={ariaLabel}
      onClick={onClick}
      disabled={disabled}
      className={cn(
        "flex h-full items-center justify-center rounded-r px-2 outline-none transition-colors",
        disabled
          ? "cursor-not-allowed text-[#98a2b3]"
          : "cursor-pointer text-[#475467] hover:bg-[#f2f4f7] focus-visible:bg-[#f2f4f7]"
      )}
    >
      {children}
    </button>
  )
}

export function InputWithTrailing({
  id,
  type = "text",
  value,
  onChange,
  placeholder,
  readOnly = false,
  trailing,
}: {
  id: string
  type?: "text" | "password"
  value: string
  onChange: (next: string) => void
  placeholder: string
  readOnly?: boolean
  trailing: ReactNode
}) {
  const inputType = readOnly ? "text" : type

  return (
    <div
      className={cn(
        "flex h-9 w-full shrink-0 isolate items-stretch rounded shadow-[0_1px_1px_rgba(16,24,40,0.05)]",
        !readOnly &&
          "focus-within:shadow-[0_0_0_4px_#eff4ff,0_1px_1px_rgba(16,24,40,0.05)]"
      )}
    >
      <div
        className={cn(
          "relative z-[2] flex h-full min-w-0 flex-1 items-center rounded-l border border-r-0 border-[#d0d5dd] px-2",
          readOnly ? "bg-[#f9fafb]" : "bg-white focus-within:border-[#84adff]"
        )}
      >
        <input
          id={id}
          type={inputType}
          value={value}
          readOnly={readOnly}
          onChange={(event) => onChange(event.target.value)}
          placeholder={placeholder}
          className={cn(
            "min-w-0 flex-1 bg-transparent font-[family-name:var(--font-inter)] text-base leading-6 outline-none placeholder:text-[#667085]",
            readOnly ? "cursor-default text-[#98a2b3]" : "text-[#101828]"
          )}
        />
      </div>
      <div
        className={cn(
          "relative z-[1] flex h-full shrink-0 items-stretch rounded-r border bg-white",
          readOnly
            ? "border-[#d0d5dd] shadow-[0_1px_2px_rgba(16,24,40,0.05)]"
            : "border-[#eaecf0]"
        )}
      >
        {trailing}
      </div>
    </div>
  )
}

export function SettingsPasswordInput({
  id,
  value,
  onChange,
  placeholder,
  readOnly = false,
  showLabel = "Show value",
  hideLabel = "Hide value",
}: {
  id: string
  value: string
  onChange: (next: string) => void
  placeholder: string
  readOnly?: boolean
  showLabel?: string
  hideLabel?: string
}) {
  const [showValue, setShowValue] = useState(false)

  return (
    <InputWithTrailing
      id={id}
      type={showValue || readOnly ? "text" : "password"}
      value={value}
      onChange={onChange}
      placeholder={placeholder}
      readOnly={readOnly}
      trailing={
        <TrailingIconButton
          ariaLabel={showValue ? hideLabel : showLabel}
          onClick={() => setShowValue((current) => !current)}
          disabled={readOnly || value.length === 0}
        >
          {showValue ? (
            <HLIcon className="size-5" decorative>
              <EyeOffIcon />
            </HLIcon>
          ) : (
            <HLIcon className="size-5" decorative>
              <EyeIcon />
            </HLIcon>
          )}
        </TrailingIconButton>
      }
    />
  )
}

export function SettingsCopyableTextInput({
  id,
  value,
  onChange,
  placeholder,
  readOnly = false,
  copyLabel = "Copy value",
}: {
  id: string
  value: string
  onChange: (next: string) => void
  placeholder: string
  readOnly?: boolean
  copyLabel?: string
}) {
  const handleCopy = async () => {
    if (!value || typeof navigator === "undefined") return

    try {
      await navigator.clipboard.writeText(value)
    } catch {
      // Clipboard unavailable in prototype.
    }
  }

  return (
    <InputWithTrailing
      id={id}
      value={value}
      onChange={onChange}
      placeholder={placeholder}
      readOnly={readOnly}
      trailing={
        <TrailingIconButton
          ariaLabel={copyLabel}
          onClick={handleCopy}
          disabled={value.length === 0}
        >
          <HLIcon className="size-5" decorative>
            <Copy01Icon />
          </HLIcon>
        </TrailingIconButton>
      }
    />
  )
}
