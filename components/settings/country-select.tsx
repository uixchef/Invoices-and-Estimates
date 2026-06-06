"use client"

import { useState } from "react"
import Image from "next/image"
import { HLIcon } from "@/components/highrise/icon"
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from "@/components/highrise/popover"
import {
  CheckIcon,
  ChevronDownIcon,
} from "@gohighlevel/ghl-icons/24/outline"
import { flagAsset } from "@/lib/integration-assets"
import {
  MERCADO_PAGO_COUNTRIES,
  type MercadoPagoCountry,
} from "@/lib/mercado-pago-config-data"
import { cn } from "@/lib/utils"

const FLAG_CODES = new Set(["AR", "BR", "CL", "CO", "MX", "PE", "US", "UY"])

function CountryFlag({ code }: { code: string }) {
  if (!FLAG_CODES.has(code)) {
    return null
  }

  return (
    <span className="relative size-5 shrink-0 overflow-hidden rounded-full">
      <Image
        src={flagAsset(code)}
        alt=""
        width={20}
        height={20}
        unoptimized
        className="size-5 object-cover"
        aria-hidden
      />
    </span>
  )
}

export function CountrySelect({
  id = "country-select",
  value,
  onChange,
  disabled = false,
  countries = MERCADO_PAGO_COUNTRIES,
  placeholder = "Choose a country",
}: {
  id?: string
  value: string
  onChange: (code: string) => void
  disabled?: boolean
  countries?: MercadoPagoCountry[]
  placeholder?: string
}) {
  const [open, setOpen] = useState(false)
  const selected = countries.find((country) => country.code === value)

  const handleSelect = (country: MercadoPagoCountry) => {
    onChange(country.code)
    setOpen(false)
  }

  return (
    <Popover open={open} onOpenChange={setOpen}>
      <PopoverTrigger asChild>
        <button
          type="button"
          id={id}
          disabled={disabled}
          aria-haspopup="listbox"
          aria-expanded={open}
          className={cn(
            "flex h-9 w-full items-center gap-2 rounded border border-[#d0d5dd] px-3 shadow-[0_1px_2px_rgba(16,24,40,0.05)] outline-none",
            disabled
              ? "cursor-default bg-[#f9fafb] text-[#98a2b3]"
              : "bg-white text-[#101828] hover:bg-[#f9fafb] focus-visible:border-[#84adff] focus-visible:shadow-[0_0_0_4px_#eff4ff,0_1px_2px_rgba(16,24,40,0.05)]"
          )}
        >
          <span className="flex min-w-0 flex-1 items-center gap-2 text-left">
            {selected ? (
              <>
                <CountryFlag code={selected.code} />
                <span className="truncate font-[family-name:var(--font-inter)] text-base leading-6">
                  {selected.label}
                </span>
              </>
            ) : (
              <span className="font-[family-name:var(--font-inter)] text-base leading-6 text-[#667085]">
                {placeholder}
              </span>
            )}
          </span>
          <HLIcon
            className={cn(
              "size-4 shrink-0",
              disabled ? "text-[#98a2b3]" : "text-[#475467]"
            )}
            decorative
          >
            <ChevronDownIcon />
          </HLIcon>
        </button>
      </PopoverTrigger>
      <PopoverContent
        align="start"
        className="w-[var(--radix-popover-trigger-width)] p-1"
      >
        <ul
          role="listbox"
          aria-label="Select country"
          className="max-h-60 overflow-y-auto"
        >
          {countries.map((country) => {
            const active = country.code === value
            return (
              <li key={country.code}>
                <button
                  type="button"
                  role="option"
                  aria-selected={active}
                  onClick={() => handleSelect(country)}
                  className={cn(
                    "flex w-full items-center gap-2 rounded px-2 py-2 text-left font-[family-name:var(--font-inter)] text-base leading-6 text-[#101828] outline-none",
                    "hover:bg-[#f2f4f7] focus-visible:bg-[#f2f4f7]",
                    active && "bg-[#f5f8ff]"
                  )}
                >
                  <CountryFlag code={country.code} />
                  <span className="min-w-0 flex-1 truncate">{country.label}</span>
                  {active ? (
                    <HLIcon
                      className="size-4 shrink-0 text-[#004eeb]"
                      decorative
                    >
                      <CheckIcon />
                    </HLIcon>
                  ) : null}
                </button>
              </li>
            )
          })}
        </ul>
      </PopoverContent>
    </Popover>
  )
}
