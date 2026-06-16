"use client"

import { useCallback, useEffect, useRef, useState } from "react"
import {
  Check,
  Copy,
  Eye,
  EyeOff,
  ThumbsDown,
  ThumbsUp,
  Undo2,
  Volume2,
  VolumeX,
} from "lucide-react"

import { FeedbackDialog } from "@/components/ai/feedback-dialog"
import { StreamingText } from "@/components/ai/streaming-text"
import {
  Tooltip,
  TooltipContent,
  TooltipTrigger,
} from "@/components/ui/tooltip"
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
  disabled,
  onClick,
  children,
}: {
  label: string
  active?: boolean
  disabled?: boolean
  onClick: () => void
  children: React.ReactNode
}) {
  return (
    <button
      type="button"
      aria-label={label}
      aria-pressed={active}
      disabled={disabled}
      onClick={onClick}
      className={cn(
        "inline-flex size-6 items-center justify-center rounded-[4px] outline-none transition-colors",
        "focus-visible:ring-2 focus-visible:ring-[#155eef]/40 [&_svg]:size-3.5",
        disabled
          ? "cursor-default text-[#d0d5dd]"
          : active
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
  isCurrentVersion = false,
  isPreviewing = false,
  canPreviewVersion = false,
  onPreviewVersion,
  onExitPreview,
  onRestoreVersion,
  onFeedback,
  recommendations,
  onSelectRecommendation,
}: {
  text: string
  streaming?: boolean
  /** This answer is the version currently applied to the canvas. Its controls
   *  read "Current version" and are inert (you're already on it). */
  isCurrentVersion?: boolean
  /** This (earlier) version is the one currently being previewed on the canvas. */
  isPreviewing?: boolean
  /** A frozen snapshot exists for this turn, so preview/restore are possible. */
  canPreviewVersion?: boolean
  /** Preview this version's layout on the canvas (read-only). */
  onPreviewVersion?: () => void
  /** Stop previewing and return to the current/live layout. */
  onExitPreview?: () => void
  /** Roll the live document back to this version. */
  onRestoreVersion?: () => void
  /** Surfaces a confirmation toast above the composer after feedback is given. */
  onFeedback?: (message: string) => void
  /** Next-step suggestion tags shown between the answer body and the toolbar. */
  recommendations?: string[]
  /** Sends a chosen recommendation as the next prompt. */
  onSelectRecommendation?: (text: string) => void
}) {
  const showVersionControls = Boolean(
    onPreviewVersion || onRestoreVersion || isCurrentVersion
  )
  const trimmed = text.trim()
  // The first line is the lead; everything after is the supporting body.
  const splitAt = trimmed.indexOf("\n")
  const headline = splitAt === -1 ? trimmed : trimmed.slice(0, splitAt)
  const body = splitAt === -1 ? "" : trimmed.slice(splitAt + 1).trim()

  const [reaction, setReaction] = useState<Reaction>(null)
  const [showThanks, setShowThanks] = useState(false)
  const [copied, setCopied] = useState(false)
  const [speaking, setSpeaking] = useState(false)
  const [feedbackOpen, setFeedbackOpen] = useState(false)
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

  // Thumbs-up: confirm inline ("Thank you :)") and toast above the composer.
  // Clicking the active state clears it.
  const handleThumbsUp = () => {
    if (thanksTimer.current) {
      window.clearTimeout(thanksTimer.current)
    }
    if (reaction === "up") {
      setReaction(null)
      setShowThanks(false)
      return
    }
    setReaction("up")
    setShowThanks(true)
    thanksTimer.current = window.setTimeout(() => setShowThanks(false), 2500)
    onFeedback?.("Feedback Submitted")
  }

  // Thumbs-down opens the feedback modal; clicking the active (red) state clears
  // it without reopening.
  const handleThumbsDown = () => {
    if (reaction === "down") {
      setReaction(null)
      return
    }
    setFeedbackOpen(true)
  }

  // Modal submit: lock in the dislike (red) and toast above the composer.
  const handleSubmitFeedback = () => {
    setShowThanks(false)
    setReaction("down")
    onFeedback?.("Feedback Submitted")
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
        className="text-sm font-semibold leading-5 text-[#5925dc]"
      />
      {body ? (
        <StreamingText
          text={body}
          streaming={streaming}
          className="text-sm leading-5 text-[#101828]"
        />
      ) : null}

      {/* Next-step suggestion tags (Figma 3312:63718) — between the answer body
          and the toolbar. Clicking one sends it as the next prompt. */}
      {recommendations && recommendations.length > 0 ? (
        <div className="flex flex-wrap items-start gap-2">
          {recommendations.map((item) => (
            <button
              key={item}
              type="button"
              onClick={() => onSelectRecommendation?.(item)}
              className="inline-flex h-6 max-w-full items-center justify-center rounded-[4px] border border-[#6938ef] bg-white px-2 font-[family-name:var(--font-inter)] text-sm font-medium leading-5 text-[#5925dc] outline-none transition-colors hover:bg-[#6938ef] hover:text-white focus-visible:ring-2 focus-visible:ring-[#155eef]/40"
            >
              <span className="truncate">{item}</span>
            </button>
          ))}
        </div>
      ) : null}

      <div className="mt-1 flex items-center justify-between">
        <div className="flex items-center gap-1">
          {reaction === "up" ? (
            <button
              type="button"
              aria-label="Good response"
              aria-pressed
              onClick={handleThumbsUp}
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
            <Tooltip>
              <TooltipTrigger asChild>
                <span>
                  <ActionButton label="Good response" onClick={handleThumbsUp}>
                    <ThumbsUp aria-hidden />
                  </ActionButton>
                </span>
              </TooltipTrigger>
              <TooltipContent>This was helpful</TooltipContent>
            </Tooltip>
          )}
          {reaction === "down" ? (
            <button
              type="button"
              aria-label="Bad response"
              aria-pressed
              onClick={handleThumbsDown}
              className={cn(
                "inline-flex size-6 items-center justify-center rounded-[4px] text-[#d92d20] outline-none transition-colors",
                "hover:bg-[#fef3f2] focus-visible:ring-2 focus-visible:ring-[#155eef]/40 [&_svg]:size-3.5"
              )}
            >
              <ThumbsDown className="fill-current" aria-hidden />
            </button>
          ) : (
            <Tooltip>
              <TooltipTrigger asChild>
                <span>
                  <ActionButton label="Bad response" onClick={handleThumbsDown}>
                    <ThumbsDown aria-hidden />
                  </ActionButton>
                </span>
              </TooltipTrigger>
              <TooltipContent>This was not helpful</TooltipContent>
            </Tooltip>
          )}

          {/* Version checkpoint controls — preview / revert the layout this
              answer produced. The latest answer reads "Current version" and is
              inert; earlier answers can be previewed (eye) or reverted to (undo). */}
          {showVersionControls ? (
            <>
              <span
                className="mx-0.5 h-3.5 w-px shrink-0 bg-[#eaecf0]"
                aria-hidden
              />
              <Tooltip>
                <TooltipTrigger asChild>
                  <span>
                    <ActionButton
                      label={
                        isCurrentVersion
                          ? "Current version"
                          : isPreviewing
                            ? "Hide preview"
                            : "Preview"
                      }
                      active={isPreviewing}
                      disabled={isCurrentVersion || !canPreviewVersion}
                      onClick={() =>
                        isPreviewing
                          ? onExitPreview?.()
                          : onPreviewVersion?.()
                      }
                    >
                      {isPreviewing ? <EyeOff aria-hidden /> : <Eye aria-hidden />}
                    </ActionButton>
                  </span>
                </TooltipTrigger>
                <TooltipContent>
                  {isCurrentVersion
                    ? "Current version"
                    : isPreviewing
                      ? "Hide Preview"
                      : "Preview"}
                </TooltipContent>
              </Tooltip>
              <Tooltip>
                <TooltipTrigger asChild>
                  <span>
                    <ActionButton
                      label="Revert to this version"
                      disabled={isCurrentVersion || !canPreviewVersion}
                      onClick={() => onRestoreVersion?.()}
                    >
                      <Undo2 aria-hidden />
                    </ActionButton>
                  </span>
                </TooltipTrigger>
                <TooltipContent>
                  {isCurrentVersion ? "Current version" : "Revert to this version"}
                </TooltipContent>
              </Tooltip>
            </>
          ) : null}
        </div>
        <div className="flex items-center gap-1">
          <Tooltip>
            <TooltipTrigger asChild>
              <span>
                <ActionButton
                  label={speaking ? "Stop reading" : "Read aloud"}
                  active={speaking}
                  onClick={handleSpeak}
                >
                  {speaking ? <VolumeX aria-hidden /> : <Volume2 aria-hidden />}
                </ActionButton>
              </span>
            </TooltipTrigger>
            <TooltipContent>
              {speaking ? "Stop reading" : "Read aloud"}
            </TooltipContent>
          </Tooltip>
          <Tooltip>
            <TooltipTrigger asChild>
              <span>
                <ActionButton
                  label={copied ? "Copied" : "Copy answer"}
                  active={copied}
                  onClick={handleCopy}
                >
                  {copied ? <Check aria-hidden /> : <Copy aria-hidden />}
                </ActionButton>
              </span>
            </TooltipTrigger>
            <TooltipContent>{copied ? "Copied" : "Copy"}</TooltipContent>
          </Tooltip>
        </div>
      </div>

      <FeedbackDialog
        open={feedbackOpen}
        onOpenChange={setFeedbackOpen}
        onSubmit={handleSubmitFeedback}
      />
    </div>
  )
}
