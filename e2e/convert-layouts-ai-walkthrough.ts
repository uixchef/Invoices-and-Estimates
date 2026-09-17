/** Converts the Playwright WebM to H.264 MP4 using Chromium's native encoder. */
import { existsSync } from "node:fs"
import { readFile, writeFile } from "node:fs/promises"
import { dirname, join } from "node:path"
import { fileURLToPath } from "node:url"

import { chromium } from "playwright"

const __dirname = dirname(fileURLToPath(import.meta.url))
const ARTIFACTS_DIR = join(__dirname, "..", "..", "artifacts")
const INPUT = join(ARTIFACTS_DIR, "layouts-ai-walkthrough.webm")
const OUTPUT = join(ARTIFACTS_DIR, "layouts-ai-walkthrough.mp4")

async function main() {
  if (!existsSync(INPUT)) {
    throw new Error(`Missing input video: ${INPUT}`)
  }

  const browser = await chromium.launch({ headless: true })
  const page = await browser.newPage()
  const sourceBase64 = (await readFile(INPUT)).toString("base64")

  try {
    const outputBase64 = await page.evaluate<string>(
      `
      (async (sourceBase64) => {
        const mimeType = "video/mp4;codecs=avc1.640028";
        if (!MediaRecorder.isTypeSupported(mimeType)) {
          throw new Error("Chromium H.264 MP4 encoding is unavailable");
        }

        const source = atob(sourceBase64);
        const bytes = new Uint8Array(source.length);
        for (let index = 0; index < source.length; index += 1) {
          bytes[index] = source.charCodeAt(index);
        }

        const video = document.createElement("video");
        video.muted = true;
        video.playsInline = true;
        video.width = 1920;
        video.height = 1080;
        video.style.display = "block";
        const sourceUrl = URL.createObjectURL(
          new Blob([bytes], { type: "video/webm" })
        );
        video.src = sourceUrl;
        document.body.append(video);

        try {
          await new Promise((resolve, reject) => {
            video.onloadedmetadata = resolve;
            video.onerror = () =>
              reject(new Error("Could not decode source WebM"));
          });
          if (video.videoWidth !== 1920 || video.videoHeight !== 1080) {
            throw new Error("Unexpected source dimensions");
          }

          const sourceDuration = video.duration;
          const stream = video.captureStream();
          if (stream.getAudioTracks().length > 0) {
            throw new Error("Audio tracks require an audio-capable MP4 profile");
          }

          const recorder = new MediaRecorder(stream, {
            mimeType,
            videoBitsPerSecond: 12000000,
          });
          const chunks = [];
          recorder.ondataavailable = (event) => {
            if (event.data.size > 0) chunks.push(event.data);
          };
          const stopped = new Promise((resolve, reject) => {
            recorder.onstop = resolve;
            recorder.onerror = () => reject(new Error("H.264 encoding failed"));
          });
          const ended = new Promise((resolve, reject) => {
            video.onended = resolve;
            video.onerror = () => reject(new Error("Source playback failed"));
          });
          const timeout = new Promise((_, reject) => {
            setTimeout(
              () => reject(new Error("H.264 encoding timed out")),
              sourceDuration * 1500 + 10000
            );
          });

          recorder.start(1000);
          await video.play();
          await Promise.race([ended, timeout]);
          recorder.stop();
          await stopped;

          const outputBlob = new Blob(chunks, { type: mimeType });
          const outputUrl = URL.createObjectURL(outputBlob);
          try {
            const verificationVideo = document.createElement("video");
            verificationVideo.src = outputUrl;
            await new Promise((resolve, reject) => {
              verificationVideo.onloadedmetadata = resolve;
              verificationVideo.onerror = () =>
                reject(new Error("Produced MP4 is unreadable"));
            });
            if (Math.abs(verificationVideo.duration - sourceDuration) > 1) {
              throw new Error("Produced MP4 duration does not match source");
            }
          } finally {
            URL.revokeObjectURL(outputUrl);
          }

          const output = new Uint8Array(await outputBlob.arrayBuffer());
          let binary = "";
          const chunkSize = 32768;
          for (let offset = 0; offset < output.length; offset += chunkSize) {
            binary += String.fromCharCode(
              ...output.subarray(offset, offset + chunkSize)
            );
          }
          return btoa(binary);
        } finally {
          URL.revokeObjectURL(sourceUrl);
          video.remove();
        }
      })(${JSON.stringify(sourceBase64)})
    `
    )

    const output = Buffer.from(outputBase64, "base64")
    if (
      output.length < 12 ||
      output.subarray(4, 8).toString("ascii") !== "ftyp"
    ) {
      throw new Error("Chromium produced an invalid MP4 container")
    }
    await writeFile(OUTPUT, output)
  } finally {
    await browser.close()
  }

  console.log(`Saved MP4: ${OUTPUT}`)
}

main().catch((error: unknown) => {
  console.error(error)
  process.exit(1)
})
