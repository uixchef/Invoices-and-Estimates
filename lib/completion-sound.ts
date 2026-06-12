"use client"

// A tiny synthesized "generation complete" cue, played when the builder
// finishes producing a layout — the equivalent of Cursor's done chime, kept
// short and soft so it reads as a confirmation rather than a notification.
//
// Synthesized via the Web Audio API on purpose: no audio asset to ship, no
// licensing concerns, and it works offline. Swap the oscillator section for an
// `Audio(src)` element later if a bespoke recorded SFX is preferred.

let audioContext: AudioContext | null = null

function getAudioContext(): AudioContext | null {
  if (typeof window === "undefined") {
    return null
  }

  const AudioCtor =
    window.AudioContext ??
    (window as unknown as { webkitAudioContext?: typeof AudioContext })
      .webkitAudioContext

  if (!AudioCtor) {
    return null
  }

  if (!audioContext) {
    try {
      audioContext = new AudioCtor()
    } catch {
      return null
    }
  }

  return audioContext
}

/**
 * Warms (and resumes) the audio context from inside a user gesture — e.g. the
 * click that kicks off generation. Browsers only allow audio to start after an
 * interaction, so priming here lets the later completion cue play even though
 * it fires from a timer once generation settles.
 */
export function primeCompletionSound(): void {
  const ctx = getAudioContext()
  if (ctx && ctx.state === "suspended") {
    void ctx.resume().catch(() => {})
  }
}

/**
 * Plays a short, soft ascending two-note chime. Safe to call on every
 * generation; it's a no-op when the Web Audio API is unavailable.
 */
export function playCompletionSound(): void {
  const ctx = getAudioContext()
  if (!ctx) {
    return
  }

  if (ctx.state === "suspended") {
    void ctx.resume().catch(() => {})
  }

  const now = ctx.currentTime

  const master = ctx.createGain()
  master.gain.setValueAtTime(0.12, now)
  master.connect(ctx.destination)

  // Ascending perfect fifth (B5 → E6): bright and resolved, reads as "done".
  const notes = [
    { freq: 987.77, at: 0, duration: 0.16 },
    { freq: 1318.51, at: 0.085, duration: 0.34 },
  ]

  for (const note of notes) {
    const oscillator = ctx.createOscillator()
    const gain = ctx.createGain()

    oscillator.type = "triangle"
    oscillator.frequency.setValueAtTime(note.freq, now)

    const start = now + note.at
    const end = start + note.duration

    // Quick attack, smooth exponential release so it doesn't click.
    gain.gain.setValueAtTime(0.0001, start)
    gain.gain.exponentialRampToValueAtTime(1, start + 0.012)
    gain.gain.exponentialRampToValueAtTime(0.0001, end)

    oscillator.connect(gain)
    gain.connect(master)

    oscillator.start(start)
    oscillator.stop(end + 0.02)
  }
}
