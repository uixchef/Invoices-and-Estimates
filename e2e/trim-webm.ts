import { readFile, writeFile } from "node:fs/promises"

import { type Browser } from "playwright"

/**
 * Capture-only WebM trim. Playwright's recorder starts at context creation,
 * so we cut the idle/hydration preamble after the fact.
 */
export async function trimWebm(
  browser: Browser,
  inputPath: string,
  outputPath: string,
  startMs: number,
  durationMs: number
) {
  const startSec = Math.max(0, startMs) / 1000
  const durationSec = Math.max(0.1, durationMs) / 1000
  const sourceBase64 = (await readFile(inputPath)).toString("base64")
  const page = await browser.newPage()

  try {
    const outputBase64 = await page.evaluate(
      async ({ sourceBase64, startSec, durationSec }) => {
        const source = atob(sourceBase64)
        const bytes = new Uint8Array(source.length)
        for (let index = 0; index < source.length; index += 1) {
          bytes[index] = source.charCodeAt(index)
        }

        const video = document.createElement("video")
        video.muted = true
        video.playsInline = true
        video.width = 1920
        video.height = 1080
        const sourceUrl = URL.createObjectURL(
          new Blob([bytes], { type: "video/webm" })
        )
        video.src = sourceUrl
        document.body.append(video)

        await new Promise<void>((resolve, reject) => {
          video.onloadedmetadata = () => resolve()
          video.onerror = () => reject(new Error("Could not decode WebM"))
        })

        const mimeType = MediaRecorder.isTypeSupported("video/webm;codecs=vp8")
          ? "video/webm;codecs=vp8"
          : "video/webm"
        const stream = (
          video as HTMLVideoElement & { captureStream: () => MediaStream }
        ).captureStream()
        const recorder = new MediaRecorder(stream, { mimeType })
        const chunks: Blob[] = []
        recorder.ondataavailable = (event) => {
          if (event.data.size > 0) {
            chunks.push(event.data)
          }
        }
        const stopped = new Promise<void>((resolve, reject) => {
          recorder.onstop = () => resolve()
          recorder.onerror = () => reject(new Error("WebM trim failed"))
        })

        video.currentTime = startSec
        await new Promise<void>((resolve) => {
          video.onseeked = () => resolve()
        })

        recorder.start()
        await video.play()
        await new Promise<void>((resolve) => {
          window.setTimeout(resolve, durationSec * 1000)
        })
        video.pause()
        recorder.stop()
        await stopped

        const blob = new Blob(chunks, { type: mimeType })
        const buffer = await blob.arrayBuffer()
        const chars = new Uint8Array(buffer)
        let binary = ""
        for (const byte of chars) {
          binary += String.fromCharCode(byte)
        }
        URL.revokeObjectURL(sourceUrl)
        return btoa(binary)
      },
      { sourceBase64, startSec, durationSec }
    )

    await writeFile(outputPath, Buffer.from(outputBase64, "base64"))
  } finally {
    await page.close()
  }
}
