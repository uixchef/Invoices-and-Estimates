"use client"

import { useEffect, useMemo, useRef, useState } from "react"
import { ChevronDown, ChevronUp, CornerDownLeft } from "lucide-react"

import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu"
import { cn } from "@/lib/utils"

/**
 * Figma: HighRise AI — "Questions" / Prompt Stencil (User Input Form) (37815:27411)
 *
 * Cursor-style clarification card. The assistant asks the user a set of
 * questions before generating. One question is active at a time; the rest are
 * dimmed for context. Supports free text, single/multi select (lettered
 * options), dropdown select, and a segmented number stepper, plus an optional
 * free-text "Other" escape hatch.
 */
export type AiQuestionOption = {
  id: string
  label: string
}

type AiQuestionBase = {
  id: string
  prompt: string
  required?: boolean
}

export type AiQuestion =
  | (AiQuestionBase & { type: "text"; placeholder?: string })
  | (AiQuestionBase & {
      type: "single-select"
      options: AiQuestionOption[]
      allowOther?: boolean
    })
  | (AiQuestionBase & {
      type: "multi-select"
      options: AiQuestionOption[]
      allowOther?: boolean
    })
  | (AiQuestionBase & {
      type: "select"
      options: AiQuestionOption[]
      placeholder?: string
    })
  | (AiQuestionBase & { type: "stepper"; options: string[] })

export type AiAnswerValue = string | string[]
export type AiAnswers = Record<string, AiAnswerValue>

const OTHER_VALUE = "__other__"

function letterFor(index: number): string {
  return String.fromCharCode(65 + index)
}

function defaultAnswers(questions: AiQuestion[]): AiAnswers {
  const next: AiAnswers = {}
  for (const question of questions) {
    if (question.type === "stepper") {
      next[question.id] = question.options[0] ?? ""
    } else if (question.type === "multi-select") {
      next[question.id] = []
    }
  }
  return next
}

function isAnswered(question: AiQuestion, answers: AiAnswers): boolean {
  const value = answers[question.id]
  if (question.type === "multi-select") {
    return Array.isArray(value) && value.length > 0
  }
  if (typeof value === "string") {
    return value.trim().length > 0
  }
  return false
}

/**
 * Circular (single-select) or square (multi-select) lettered option badge.
 * Selection fills the badge; hover only reacts while the question is active.
 *
 * Figma: OrderedList (37814:24710) — default / hover × selected / multi states.
 */
function OptionBadge({
  letter,
  selected,
  multi,
  active,
}: {
  letter: string
  selected: boolean
  multi: boolean
  active: boolean
}) {
  return (
    <span
      aria-hidden
      className={cn(
        "flex size-6 shrink-0 items-center justify-center border text-xs font-semibold leading-[17px] transition-colors",
        multi ? "rounded-[4px]" : "rounded-full",
        selected
          ? cn(
              "border-[#3e1c96] bg-[#6938ef] text-white",
              active && "group-hover:bg-[#4a1fb8]"
            )
          : cn(
              "border-[#d0d5dd] bg-white text-[#475467]",
              active && "group-hover:bg-[#ebe9fe]"
            )
      )}
    >
      {letter}
    </span>
  )
}

function SelectControl({
  question,
  value,
  disabled,
  onChange,
}: {
  question: Extract<AiQuestion, { type: "select" }>
  value: string | undefined
  disabled: boolean
  onChange: (value: string) => void
}) {
  const selected = question.options.find((option) => option.id === value)

  return (
    <DropdownMenu>
      <DropdownMenuTrigger
        disabled={disabled}
        className={cn(
          "flex h-9 w-full items-center gap-2 rounded-[6px] border border-[#d0d5dd] bg-white px-3 text-left outline-none transition-colors",
          "shadow-[0px_1px_2px_0px_rgba(16,24,40,0.05)]",
          "focus-visible:border-[#bdb4fe] focus-visible:ring-4 focus-visible:ring-[#ebe9fe]",
          "disabled:cursor-not-allowed"
        )}
      >
        <span
          className={cn(
            "min-w-0 flex-1 truncate text-sm font-normal leading-5",
            selected ? "text-[#101828]" : "text-[#667085]"
          )}
        >
          {selected ? selected.label : question.placeholder ?? "Select…"}
        </span>
        <ChevronDown className="size-4 shrink-0 text-[#667085]" aria-hidden />
      </DropdownMenuTrigger>
      <DropdownMenuContent
        align="start"
        className="w-[var(--radix-dropdown-menu-trigger-width)] font-[family-name:var(--font-inter)]"
      >
        {question.options.map((option) => (
          <DropdownMenuItem
            key={option.id}
            onSelect={() => onChange(option.id)}
            className="text-sm text-[#101828]"
          >
            {option.label}
          </DropdownMenuItem>
        ))}
      </DropdownMenuContent>
    </DropdownMenu>
  )
}

function StepperControl({
  question,
  value,
  disabled,
  onChange,
}: {
  question: Extract<AiQuestion, { type: "stepper" }>
  value: string | undefined
  disabled: boolean
  onChange: (value: string) => void
}) {
  const active = value ?? question.options[0]

  return (
    <div className="flex w-full overflow-hidden rounded-lg border border-[#d0d5dd]">
      {question.options.map((option, index) => {
        const isActive = option === active
        return (
          <button
            key={option}
            type="button"
            disabled={disabled}
            onClick={() => onChange(option)}
            aria-pressed={isActive}
            className={cn(
              "flex flex-1 items-center justify-center px-3.5 py-2 text-sm font-semibold leading-5 outline-none transition-colors",
              index > 0 && "border-l border-[#d0d5dd]",
              isActive
                ? "bg-[#f4f3ff] text-[#5925dc]"
                : "bg-white text-[#475467] hover:bg-[#f9fafb]",
              "focus-visible:relative focus-visible:ring-2 focus-visible:ring-[#bdb4fe]",
              "disabled:cursor-not-allowed"
            )}
          >
            {option}
          </button>
        )
      })}
    </div>
  )
}

function OtherField({
  active,
  value,
  onChange,
  placeholder,
}: {
  active: boolean
  value: string
  onChange: (value: string) => void
  placeholder: string
}) {
  if (!active) {
    return (
      <div className="flex h-9 items-center rounded-[6px] border border-[#d0d5dd] bg-white px-2 text-sm font-normal leading-5 text-[#667085] shadow-[0px_1px_2px_0px_rgba(16,24,40,0.05)]">
        {placeholder}
      </div>
    )
  }

  return (
    <input
      type="text"
      value={value}
      placeholder={placeholder}
      onChange={(event) => onChange(event.target.value)}
      className={cn(
        "h-9 w-full rounded-[6px] border border-[#d0d5dd] bg-white px-2 text-sm font-normal leading-5 text-[#101828] outline-none transition-colors",
        "shadow-[0px_1px_2px_0px_rgba(16,24,40,0.05)] placeholder:text-[#667085] caret-[#6938ef]",
        "focus:border-[#bdb4fe] focus:ring-4 focus:ring-[#ebe9fe]"
      )}
    />
  )
}

function QuestionBlock({
  question,
  index,
  active,
  answers,
  otherText,
  onActivate,
  onAnswer,
  onOther,
}: {
  question: AiQuestion
  index: number
  active: boolean
  answers: AiAnswers
  otherText: Record<string, string>
  onActivate: () => void
  onAnswer: (value: AiAnswerValue) => void
  onOther: (value: string) => void
}) {
  const value = answers[question.id]
  const disabled = !active

  const renderControl = () => {
    switch (question.type) {
      case "text":
        return active ? (
          <textarea
            autoFocus
            rows={3}
            value={typeof value === "string" ? value : ""}
            placeholder={question.placeholder ?? "Type your answer…"}
            onChange={(event) => onAnswer(event.target.value)}
            className={cn(
              "min-h-[88px] w-full resize-none rounded-[6px] border border-[#bdb4fe] bg-white p-2 text-sm font-normal leading-5 text-[#101828] outline-none",
              "shadow-[0px_0px_0px_4px_#ebe9fe] placeholder:text-[#667085] caret-[#6938ef]"
            )}
          />
        ) : (
          <div className="min-h-[88px] w-full rounded-[6px] border border-[#d0d5dd] bg-white p-2 text-sm font-normal leading-5 text-[#667085]">
            {typeof value === "string" && value
              ? value
              : question.placeholder ?? "Type your answer…"}
          </div>
        )

      case "single-select":
      case "select": {
        if (question.type === "select") {
          return (
            <SelectControl
              question={question}
              value={typeof value === "string" ? value : undefined}
              disabled={disabled}
              onChange={onAnswer}
            />
          )
        }

        const otherSelected = value === OTHER_VALUE
        return (
          <div className="flex flex-col gap-3">
            {question.options.map((option, optionIndex) => {
              const selected = value === option.id
              return (
                <button
                  key={option.id}
                  type="button"
                  disabled={disabled}
                  onClick={() => onAnswer(option.id)}
                  className="group flex items-center gap-2 text-left outline-none disabled:cursor-default"
                >
                  <OptionBadge
                    letter={letterFor(optionIndex)}
                    selected={selected}
                    multi={false}
                    active={active}
                  />
                  <span className="min-w-0 flex-1 truncate text-sm font-normal leading-5 text-[#101828]">
                    {option.label}
                  </span>
                </button>
              )
            })}
            {question.allowOther ? (
              <div className="flex items-center gap-2">
                <button
                  type="button"
                  disabled={disabled}
                  onClick={() => onAnswer(OTHER_VALUE)}
                  className="group outline-none disabled:cursor-default"
                  aria-label="Other"
                >
                  <OptionBadge
                    letter={letterFor(question.options.length)}
                    selected={otherSelected}
                    multi={false}
                    active={active}
                  />
                </button>
                <div className="min-w-0 flex-1">
                  <OtherField
                    active={active && otherSelected}
                    value={otherText[question.id] ?? ""}
                    onChange={onOther}
                    placeholder="Other"
                  />
                </div>
              </div>
            ) : null}
          </div>
        )
      }

      case "multi-select": {
        const selectedValues = Array.isArray(value) ? value : []
        const toggle = (optionId: string) => {
          const next = selectedValues.includes(optionId)
            ? selectedValues.filter((id) => id !== optionId)
            : [...selectedValues, optionId]
          onAnswer(next)
        }
        const otherSelected = selectedValues.includes(OTHER_VALUE)
        return (
          <div className="flex flex-col gap-3">
            {question.options.map((option, optionIndex) => (
              <button
                key={option.id}
                type="button"
                disabled={disabled}
                onClick={() => toggle(option.id)}
                className="group flex items-center gap-2 text-left outline-none disabled:cursor-default"
              >
                <OptionBadge
                  letter={letterFor(optionIndex)}
                  selected={selectedValues.includes(option.id)}
                  multi
                  active={active}
                />
                <span className="min-w-0 flex-1 truncate text-sm font-normal leading-5 text-[#101828]">
                  {option.label}
                </span>
              </button>
            ))}
            {question.allowOther ? (
              <div className="flex items-center gap-2">
                <button
                  type="button"
                  disabled={disabled}
                  onClick={() => toggle(OTHER_VALUE)}
                  className="group outline-none disabled:cursor-default"
                  aria-label="Other"
                >
                  <OptionBadge
                    letter={letterFor(question.options.length)}
                    selected={otherSelected}
                    multi
                    active={active}
                  />
                </button>
                <div className="min-w-0 flex-1">
                  <OtherField
                    active={active && otherSelected}
                    value={otherText[question.id] ?? ""}
                    onChange={onOther}
                    placeholder="Enter more…"
                  />
                </div>
              </div>
            ) : null}
          </div>
        )
      }

      case "stepper":
        return (
          <StepperControl
            question={question}
            value={typeof value === "string" ? value : undefined}
            disabled={disabled}
            onChange={onAnswer}
          />
        )

      default:
        return null
    }
  }

  return (
    <div
      role={active ? undefined : "button"}
      tabIndex={active ? undefined : 0}
      onClick={active ? undefined : onActivate}
      onKeyDown={
        active
          ? undefined
          : (event) => {
              if (event.key === "Enter" || event.key === " ") {
                event.preventDefault()
                onActivate()
              }
            }
      }
      className={cn(
        "flex flex-col gap-2 transition-opacity",
        active ? "opacity-100" : "cursor-pointer opacity-50 hover:opacity-70"
      )}
    >
      <div className="flex items-center gap-2">
        <span className="w-6 shrink-0 text-center text-sm font-semibold leading-5 text-[#101828]">
          {index + 1}.
        </span>
        <span className="flex min-w-0 flex-1 items-start gap-0.5">
          <span className="text-sm font-semibold leading-5 text-[#101828]">
            {question.prompt}
          </span>
          {question.required ? (
            <span className="text-sm font-semibold leading-5 text-[#b42318]">
              *
            </span>
          ) : null}
        </span>
      </div>
      <div className="pl-8">{renderControl()}</div>
    </div>
  )
}

type AiQuestionsProps = {
  questions: AiQuestion[]
  title?: string
  /**
   * When true, renders as a stencil docked to the top of the prompt box:
   * top-only rounded corners and no bottom border, so it fuses with the
   * composer below (Cursor-style). Defaults to a standalone rounded card.
   */
  docked?: boolean
  onComplete: (answers: AiAnswers) => void
  onSkip?: () => void
  className?: string
}

export function AiQuestions({
  questions,
  title = "Questions",
  docked = false,
  onComplete,
  onSkip,
  className,
}: AiQuestionsProps) {
  const [answers, setAnswers] = useState<AiAnswers>(() =>
    defaultAnswers(questions)
  )
  const [otherText, setOtherText] = useState<Record<string, string>>({})
  const [activeIndex, setActiveIndex] = useState(0)

  const total = questions.length
  const activeQuestion = questions[activeIndex]
  const scrollRef = useRef<HTMLDivElement>(null)
  const activeRef = useRef<HTMLDivElement>(null)

  useEffect(() => {
    activeRef.current?.scrollIntoView({ block: "nearest", behavior: "smooth" })
  }, [activeIndex])

  const canContinue = useMemo(() => {
    if (!activeQuestion) {
      return false
    }
    if (!activeQuestion.required) {
      return true
    }
    return isAnswered(activeQuestion, answers)
  }, [activeQuestion, answers])

  const isLast = activeIndex >= total - 1

  const mergeOtherText = (current: AiAnswers): AiAnswers => {
    const next: AiAnswers = { ...current }
    for (const question of questions) {
      if (question.type !== "single-select" && question.type !== "multi-select") {
        continue
      }
      if (!("allowOther" in question) || !question.allowOther) {
        continue
      }
      const free = otherText[question.id]?.trim()
      if (!free) {
        continue
      }
      const value = current[question.id]
      if (question.type === "single-select" && value === OTHER_VALUE) {
        next[question.id] = free
      }
      if (question.type === "multi-select" && Array.isArray(value)) {
        next[question.id] = value.map((entry) =>
          entry === OTHER_VALUE ? free : entry
        )
      }
    }
    return next
  }

  const handleContinue = () => {
    if (!canContinue) {
      return
    }
    if (isLast) {
      onComplete(mergeOtherText(answers))
      return
    }
    setActiveIndex((index) => Math.min(index + 1, total - 1))
  }

  const goPrev = () => setActiveIndex((index) => Math.max(index - 1, 0))
  const goNext = () => setActiveIndex((index) => Math.min(index + 1, total - 1))

  return (
    <div
      className={cn(
        "flex w-full flex-col overflow-hidden border border-[#bdb4fe] font-[family-name:var(--font-inter)]",
        "bg-gradient-to-b from-[#ebe9fe] to-[#fafaff]",
        docked
          ? "rounded-t-lg border-b-0"
          : "max-w-[480px] rounded-lg",
        className
      )}
    >
      <div className="flex items-center justify-between gap-2 px-4 pt-4 pb-3">
        <div className="flex min-w-0 items-center gap-2">
          <span
            aria-hidden
            className="flex size-5 shrink-0 items-center justify-center rounded-[5px] bg-[#101828] text-[11px] font-bold leading-none text-white"
          >
            ?
          </span>
          <span className="truncate text-base font-semibold leading-6 text-[#475467]">
            {title}
          </span>
        </div>
        <div className="flex shrink-0 items-center gap-1">
          <button
            type="button"
            onClick={goPrev}
            disabled={activeIndex === 0}
            aria-label="Previous question"
            className="inline-flex size-6 items-center justify-center rounded text-[#475467] outline-none transition-colors hover:bg-[#ffffff80] disabled:cursor-not-allowed disabled:text-[#d0d5dd] focus-visible:ring-2 focus-visible:ring-[#bdb4fe]"
          >
            <ChevronUp className="size-4" aria-hidden />
          </button>
          <span className="text-sm font-medium leading-5 text-[#475467]">
            {activeIndex + 1} of {total}
          </span>
          <button
            type="button"
            onClick={goNext}
            disabled={isLast}
            aria-label="Next question"
            className="inline-flex size-6 items-center justify-center rounded text-[#475467] outline-none transition-colors hover:bg-[#ffffff80] disabled:cursor-not-allowed disabled:text-[#d0d5dd] focus-visible:ring-2 focus-visible:ring-[#bdb4fe]"
          >
            <ChevronDown className="size-4" aria-hidden />
          </button>
        </div>
      </div>

      <div
        ref={scrollRef}
        className="flex max-h-[260px] flex-col gap-6 overflow-y-auto px-4 pb-4"
      >
        {questions.map((question, index) => {
          const active = index === activeIndex
          return (
            <div key={question.id} ref={active ? activeRef : undefined}>
              <QuestionBlock
                question={question}
                index={index}
                active={active}
                answers={answers}
                otherText={otherText}
                onActivate={() => setActiveIndex(index)}
                onAnswer={(value) =>
                  setAnswers((current) => ({
                    ...current,
                    [question.id]: value,
                  }))
                }
                onOther={(value) =>
                  setOtherText((current) => ({
                    ...current,
                    [question.id]: value,
                  }))
                }
              />
            </div>
          )
        })}
      </div>

      <div className="flex items-center justify-end gap-1 bg-[#fafaff] px-4 pb-4 pt-3">
        <button
          type="button"
          onClick={onSkip}
          className="flex h-8 items-center justify-center rounded-[4px] px-2.5 text-[13px] font-semibold leading-[18px] text-[#5925dc] outline-none transition-colors hover:bg-[#ffffff80] focus-visible:ring-2 focus-visible:ring-[#bdb4fe]"
        >
          Skip
        </button>
        <button
          type="button"
          onClick={handleContinue}
          disabled={!canContinue}
          className={cn(
            "flex h-8 items-center justify-center gap-2 rounded-[4px] border px-2.5 text-[13px] font-semibold leading-[18px] text-white outline-none transition-colors",
            "shadow-[0px_1px_2px_0px_rgba(16,24,40,0.05)] focus-visible:ring-2 focus-visible:ring-[#bdb4fe]",
            canContinue
              ? "border-[#6938ef] bg-[#6938ef] hover:bg-[#5925dc]"
              : "cursor-not-allowed border-[#d9d6fe] bg-[#d9d6fe]"
          )}
        >
          Continue
          <CornerDownLeft className="size-4" aria-hidden />
        </button>
      </div>
    </div>
  )
}
