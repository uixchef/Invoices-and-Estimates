"use client"

import { useCallback, useEffect, useRef, useState } from "react"
import {
  Check,
  Copy,
  ThumbsDown,
  ThumbsUp,
  Volume2,
  VolumeX,
} from "lucide-react"

import { StreamingText } from "@/components/ai/streaming-text"
import { cn } from "@/lib/utils"

/**
 * Figma: Ask AI / "Answer" (8241:167535)
 *
 * The assistant's final deliverable. A bold purple lead line introduces the
 * result, the body renders the recap at reading size, and a footer toolbar lets
 * the user react (thumbs up/down), play the answer aloud, and copy it — adapted
 * to the Invoice AI brand.
 */
type Reaction = "up" | "down" | null

function ActionButton({
  label,
  active,
  onClick,
  children,
}: {
  label: string
  active?: boolean
  onClick: () => void
  children: React.ReactNode
}) {
  return (
    <button
      type="button"
      aria-label={label}
      aria-pressed={active}
      onClick={onClick}
      className={cn(
        "inline-flex size-6 items-center justify-center rounded-[4px] outline-none transition-colors",
        "focus-visible:ring-2 focus-visible:ring-[#155eef]/40 [&_svg]:size-3.5",
        active
          ? "text-[#5925dc]"
          : "text-[#667085] hover:bg-[#f2f4f7] hover:text-[#101828]"
      )}
    >
      {children}
    </button>
  )
}

export function AiAnswer({
  text,
  streaming = false,
}: {
  text: string
  streaming?: boolean
}) {
  const trimmed = text.trim()
  // The first line is the lead; everything after is the supporting body.
  const splitAt = trimmed.indexOf("\n")
  const headline = splitAt === -1 ? trimmed : trimmed.slice(0, splitAt)
  const body = splitAt === -1 ? "" : trimmed.slice(splitAt + 1).trim()

  const [reaction, setReaction] = useState<Reaction>(null)
  const [showThanks, setShowThanks] = useState(false)
  const [copied, setCopied] = useState(false)
  const [speaking, setSpeaking] = useState(false)
  const copyTimer = useRef<number | null>(null)
  const thanksTimer = useRef<number | null>(null)

  useEffect(() => {
    return () => {
      if (copyTimer.current) {
        window.clearTimeout(copyTimer.current)
      }
      if (thanksTimer.current) {
        window.clearTimeout(thanksTimer.current)
      }
      if (typeof window !== "undefined") {
        window.speechSynthesis?.cancel()
      }
    }
  }, [])

  const handleReact = (value: "up" | "down") => {
    const next = reaction === value ? null : value
    setReaction(next)
    if (thanksTimer.current) {
      window.clearTimeout(thanksTimer.current)
    }
    // A thumbs-up shows a brief "Thank you :)" confirmation, then collapses to
    // the filled icon (Figma 334:114339 / 334:109253).
    if (next === "up") {
      setShowThanks(true)
      thanksTimer.current = window.setTimeout(() => setShowThanks(false), 2500)
    } else {
      setShowThanks(false)
    }
  }

  const handleCopy = useCallback(async () => {
    try {
      await navigator.clipboard.writeText(trimmed)
      setCopied(true)
      if (copyTimer.current) {
        window.clearTimeout(copyTimer.current)
      }
      copyTimer.current = window.setTimeout(() => setCopied(false), 1500)
    } catch {
      // Clipboard can be blocked (permissions / insecure context); ignore.
    }
  }, [trimmed])

  const handleSpeak = useCallback(() => {
    if (typeof window === "undefined" || !window.speechSynthesis) {
      return
    }
    if (speaking) {
      window.speechSynthesis.cancel()
      setSpeaking(false)
      return
    }
    const utterance = new SpeechSynthesisUtterance(trimmed)
    utterance.onend = () => setSpeaking(false)
    utterance.onerror = () => setSpeaking(false)
    window.speechSynthesis.cancel()
    window.speechSynthesis.speak(utterance)
    setSpeaking(true)
  }, [speaking, trimmed])

  return (
    <div className="flex flex-col gap-2">
      <StreamingText
        text={headline}
        streaming={streaming}
        className="text-base font-semibold leading-6 text-[#5925dc]"
      />
      {body ? (
        <StreamingText
          text={body}
          streaming={streaming}
          className="text-base leading-6 text-[#101828]"
        />
      ) : null}

      <div className="mt-1 flex items-center justify-between">
        <div className="flex items-center gap-1">
          {reaction === "up" ? (
            <button
              type="button"
              aria-label="Good response"
              aria-pressed
              onClick={() => handleReact("up")}
              className={cn(
                "inline-flex h-6 items-center gap-1 rounded-[4px] text-[#027a48] outline-none transition-colors",
                "focus-visible:ring-2 focus-visible:ring-[#155eef]/40 [&_svg]:size-3.5",
                showThanks ? "px-1.5" : "size-6 justify-center"
              )}
            >
              <ThumbsUp className="fill-current" aria-hidden />
              {showThanks ? (
                <span className="whitespace-nowrap text-sm font-semibold leading-5">
                  Thank you :)
                </span>
              ) : null}
            </button>
          ) : (
            <ActionButton label="Good response" onClick={() => handleReact("up")}>
              <ThumbsUp aria-hidden />
            </ActionButton>
          )}
          {reaction === "down" ? (
            <button
              type="button"
              aria-label="Bad response"
              aria-pressed
              onClick={() => handleReact("down")}
              className={cn(
                "inline-flex size-6 items-center justify-center rounded-[4px] text-[#475467] outline-none transition-colors",
                "hover:bg-[#f2f4f7] focus-visible:ring-2 focus-visible:ring-[#155eef]/40 [&_svg]:size-3.5"
              )}
            >
              <ThumbsDown className="fill-current" aria-hidden />
            </button>
          ) : (
            <ActionButton label="Bad response" onClick={() => handleReact("down")}>
              <ThumbsDown aria-hidden />
            </ActionButton>
          )}
        </div>
        <div className="flex items-center gap-1">
          <ActionButton
            label={speaking ? "Stop reading" : "Read aloud"}
            active={speaking}
            onClick={handleSpeak}
          >
            {speaking ? <VolumeX aria-hidden /> : <Volume2 aria-hidden />}
          </ActionButton>
          <ActionButton
            label={copied ? "Copied" : "Copy answer"}
            active={copied}
            onClick={handleCopy}
          >
            {copied ? <Check aria-hidden /> : <Copy aria-hidden />}
          </ActionButton>
        </div>
      </div>
    </div>
  )
}
