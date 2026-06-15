"use client"

// Completion cue: a short (~120ms) "receipt tear" — white noise through a
// highpass filter sweeping 900Hz → 4200Hz, with a fast attack and exponential
// decay, so it reads as a crisp receipt rip. Synthesized via the Web Audio API
// on purpose: no audio asset to ship, no licensing concerns, works offline.
// Played when the builder finishes producing a layout.

const MIN_INTERVAL_MS = 400 // debounce rapid back-to-back generations
const DEFAULT_VOLUME = 0.75

let sharedCtx: AudioContext | null = null
let sharedNoise: AudioBuffer | null = null
let lastPlayed = 0

function getContext(): AudioContext | null {
  if (typeof window === "undefined") {
    return null
  }

  if (!sharedCtx) {
    const Ctor =
      window.AudioContext ??
      (window as unknown as { webkitAudioContext?: typeof AudioContext })
        .webkitAudioContext
    if (!Ctor) {
      return null
    }
    try {
      sharedCtx = new Ctor()
    } catch {
      return null
    }
  }

  if (sharedCtx.state === "suspended") {
    void sharedCtx.resume().catch(() => {})
  }

  return sharedCtx
}

function getNoiseBuffer(ctx: AudioContext): AudioBuffer {
  if (!sharedNoise) {
    sharedNoise = ctx.createBuffer(1, ctx.sampleRate, ctx.sampleRate)
    const data = sharedNoise.getChannelData(0)
    for (let i = 0; i < data.length; i++) {
      data[i] = Math.random() * 2 - 1
    }
  }
  return sharedNoise
}

/**
 * Warms (and resumes) the audio context from inside a user gesture — e.g. the
 * click that kicks off generation. Browsers only allow audio to start after an
 * interaction, so priming here lets the cue play even though it fires from a
 * timer once generation settles.
 */
export function primeCompletionSound(): void {
  getContext()
}

/**
 * Plays the receipt-tear completion cue. Debounced so rapid back-to-back
 * generations don't stack, and a no-op when the Web Audio API is unavailable,
 * so it's safe to call on every generation.
 */
export function playCompletionSound(volume = DEFAULT_VOLUME): void {
  const ctx = getContext()
  if (!ctx) {
    return
  }

  const now = Date.now()
  if (now - lastPlayed < MIN_INTERVAL_MS) {
    return
  }
  lastPlayed = now

  const t = ctx.currentTime
  const source = ctx.createBufferSource()
  source.buffer = getNoiseBuffer(ctx)

  const filter = ctx.createBiquadFilter()
  filter.type = "highpass"
  filter.frequency.setValueAtTime(900, t)
  filter.frequency.exponentialRampToValueAtTime(4200, t + 0.1)

  const gain = ctx.createGain()
  gain.gain.setValueAtTime(0, t)
  gain.gain.linearRampToValueAtTime(volume, t + 0.008)
  gain.gain.exponentialRampToValueAtTime(0.0001, t + 0.12)

  source.connect(filter)
  filter.connect(gain)
  gain.connect(ctx.destination)

  source.start(t)
  source.stop(t + 0.15)
}

const QUESTION_VOLUME = 0.4

/**
 * Plays a soft two-note "question" chime — a gentle rising interval (E5 → B5)
 * of triangle tones, clearly distinct from the receipt-tear completion cue.
 * Signals the AI is asking for input. Debounced and a no-op without Web Audio,
 * so it's safe to call on the status transition.
 */
export function playQuestionSound(volume = QUESTION_VOLUME): void {
  const ctx = getContext()
  if (!ctx) {
    return
  }

  const now = Date.now()
  if (now - lastPlayed < MIN_INTERVAL_MS) {
    return
  }
  lastPlayed = now

  const t = ctx.currentTime
  // Rising two-note prompt: E5 then B5, each a soft triangle "mallet" tone.
  const notes: { freq: number; at: number }[] = [
    { freq: 659.25, at: 0 },
    { freq: 987.77, at: 0.11 },
  ]

  for (const { freq, at } of notes) {
    const start = t + at
    const osc = ctx.createOscillator()
    osc.type = "triangle"
    osc.frequency.setValueAtTime(freq, start)

    const gain = ctx.createGain()
    gain.gain.setValueAtTime(0, start)
    gain.gain.linearRampToValueAtTime(volume, start + 0.012)
    gain.gain.exponentialRampToValueAtTime(0.0001, start + 0.22)

    osc.connect(gain)
    gain.connect(ctx.destination)

    osc.start(start)
    osc.stop(start + 0.26)
  }
}

const ERROR_VOLUME = 0.45

/**
 * Plays a low, descending two-note "error" cue (A3 → E3) on softened sawtooth
 * tones — clearly negative and distinct from both the receipt-tear completion
 * cue and the rising question chime. Signals that a turn failed. Debounced and a
 * no-op without Web Audio, so it's safe to call on the status transition.
 */
export function playErrorSound(volume = ERROR_VOLUME): void {
  const ctx = getContext()
  if (!ctx) {
    return
  }

  const now = Date.now()
  if (now - lastPlayed < MIN_INTERVAL_MS) {
    return
  }
  lastPlayed = now

  const t = ctx.currentTime
  // Falling two-note cue: A3 then E3, a descending interval that reads as a
  // gentle "uh-oh" without being harsh.
  const notes: { freq: number; at: number }[] = [
    { freq: 220, at: 0 },
    { freq: 164.81, at: 0.13 },
  ]

  for (const { freq, at } of notes) {
    const start = t + at
    const osc = ctx.createOscillator()
    osc.type = "sawtooth"
    osc.frequency.setValueAtTime(freq, start)

    // Tame the sawtooth's edge so it reads soft rather than buzzy.
    const filter = ctx.createBiquadFilter()
    filter.type = "lowpass"
    filter.frequency.setValueAtTime(1200, start)

    const gain = ctx.createGain()
    gain.gain.setValueAtTime(0, start)
    gain.gain.linearRampToValueAtTime(volume, start + 0.014)
    gain.gain.exponentialRampToValueAtTime(0.0001, start + 0.3)

    osc.connect(filter)
    filter.connect(gain)
    gain.connect(ctx.destination)

    osc.start(start)
    osc.stop(start + 0.34)
  }
}
