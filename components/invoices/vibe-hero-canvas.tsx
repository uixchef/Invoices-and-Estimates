"use client"

import { useEffect, useRef } from "react"

/**
 * Animated purple "vibe" wash for the Create with AI hero — a faithful WebGL
 * port of the Email AI (`VibeBuilderHero`) shader: an fbm domain-warp noise
 * field lit by a right-biased bloom and a left "subtitle" reading-glow, with
 * a mouse-follow warp and soft edge feathering. Premultiplied-alpha output is
 * blended over the panel so only the lit band reads.
 *
 * Honors prefers-reduced-motion (single static frame, u_motion = 0) and is
 * devicePixelRatio-correct (capped at 2x).
 */

const VERTEX_SHADER = `
  attribute vec2 a_position;
  void main() {
    gl_Position = vec4(a_position, 0.0, 1.0);
  }
`

const FRAGMENT_SHADER = `
  precision highp float;
  uniform vec2  u_resolution;
  uniform vec2  u_mouse;       // 0..1, y = top-down
  uniform float u_time;        // seconds since mount
  uniform float u_motion;      // 1.0 animate, 0.0 static

  float hash21(vec2 p) {
    p = fract(p * vec2(123.34, 456.21));
    p += dot(p, p + 45.32);
    return fract(p.x * p.y);
  }

  float vnoise(vec2 p) {
    vec2 i = floor(p);
    vec2 f = fract(p);
    vec2 u = f * f * (3.0 - 2.0 * f);
    float a = hash21(i + vec2(0.0, 0.0));
    float b = hash21(i + vec2(1.0, 0.0));
    float c = hash21(i + vec2(0.0, 1.0));
    float d = hash21(i + vec2(1.0, 1.0));
    return mix(mix(a, b, u.x), mix(c, d, u.x), u.y);
  }

  float fbm(vec2 p) {
    float v = 0.0;
    float a = 0.55;
    for (int i = 0; i < 3; i++) {
      v += a * vnoise(p);
      p = p * 2.02 + vec2(11.7, 3.1);
      a *= 0.55;
    }
    return v;
  }

  void main() {
    vec2 fragUV = gl_FragCoord.xy / u_resolution.xy;
    float aspect = u_resolution.x / u_resolution.y;
    vec2 p = (fragUV - 0.5) * vec2(aspect, 1.0);

    float t = u_time * u_motion * 0.08;

    // Mouse in centered/aspect-corrected space; pulled into the warp so the
    // colored ribbons bend toward the cursor.
    vec2 mp = (vec2(u_mouse.x, 1.0 - u_mouse.y) - 0.5) * vec2(aspect, 1.0);

    // Two-pass domain warp.
    vec2 q = vec2(
      fbm(p + vec2(0.0, 0.0) + t),
      fbm(p + vec2(5.2, 1.3) - t)
    );
    vec2 r = vec2(
      fbm(p + 1.7 * q + vec2(1.7, 9.2) + 0.55 * mp + 1.4 * t),
      fbm(p + 1.7 * q + vec2(8.3, 2.8) - 0.55 * mp + 1.4 * t)
    );
    float field = fbm(p + 2.5 * r);

    // Big soft bloom anchored toward the right side of the hero so the colored
    // wash deepens left -> right, stretched horizontally so the right edge
    // stays saturated.
    vec2 bloomCenter = vec2(0.72, 0.62);
    vec2 bloomDelta = (fragUV - bloomCenter) * vec2(0.85, 1.40);
    float bloomDist = length(bloomDelta);
    float bloom = exp(-pow(bloomDist * 1.30, 2.0));

    // Luminance envelope behind the subtitle (upper-left) so body text reads
    // against a near-white backing.
    vec2 subtitleCenter = vec2(0.22, 0.38);
    float subtitleDist = distance(fragUV, subtitleCenter);
    float subtitleGlow = exp(-pow(subtitleDist * 2.20, 2.0));

    // Horizontal right-bias ramp: 0 far-left, 1 far-right.
    float rightBias = smoothstep(0.20, 0.95, fragUV.x);

    float n = bloom * (0.65 + 0.55 * field);

    // High-frequency breakup mask for the white highlight.
    float sparkle = fbm(p * 3.2 + vec2(7.1, 4.4) + 0.7 * t);

    // Five-stop purple ramp + soft white highlight (all-brand, no warm/pink).
    vec3 cMist  = vec3(0.769, 0.710, 0.992); // purple-300 #c4b5fd
    vec3 cBrand = vec3(0.486, 0.227, 0.929); // purple-500 #7c3aed
    vec3 cDeep  = vec3(0.357, 0.129, 0.714); // purple-700 #5b21b6
    vec3 cInk   = vec3(0.180, 0.063, 0.396); // purple-900 #2e1065
    vec3 cLit   = vec3(1.000, 0.984, 1.000); // near-white #fffbff

    vec3 col = cMist;
    col = mix(col, cBrand, smoothstep(0.20, 0.75, n));
    col = mix(col, cDeep,  smoothstep(0.55, 1.00, n) * 0.40);
    col = mix(col, cInk,   smoothstep(0.85, 1.15, n) * 0.25);

    // White highlight driven by the subtitle glow, suppressed on the right.
    float highlight = subtitleGlow * mix(0.55, 1.00, sparkle) * 0.55 * (1.0 - 0.85 * rightBias);
    col = mix(col, cLit, highlight);

    // Gentle deep-ink darkening into the right half, gated by the bloom.
    col = mix(col, cInk, smoothstep(0.10, 0.90, bloom) * rightBias * 0.18);

    float bloomAlpha     = smoothstep(0.05, 0.65, n) * mix(0.24, 0.34, rightBias);
    float highlightAlpha = highlight * 1.6;
    float alpha = max(bloomAlpha, highlightAlpha);

    // Top/bottom feathering so the wash hugs a horizontal band in the middle.
    float topFade = smoothstep(0.0, 0.32, fragUV.y);
    float botFade = smoothstep(0.0, 0.30, 1.0 - fragUV.y);
    alpha *= topFade * botFade;

    // Side feathering.
    float leftFade  = smoothstep(0.0, 0.10, fragUV.x);
    float rightFade = smoothstep(0.0, 0.03, 1.0 - fragUV.x);
    alpha *= mix(0.85, 1.0, leftFade) * mix(0.92, 1.0, rightFade);

    // Premultiplied alpha (context is premultipliedAlpha:true, blend ONE / ONE_MINUS_SRC_ALPHA).
    gl_FragColor = vec4(col * alpha, alpha);
  }
`

function compileShader(
  gl: WebGLRenderingContext,
  type: number,
  source: string
): WebGLShader | null {
  const shader = gl.createShader(type)
  if (!shader) {
    return null
  }
  gl.shaderSource(shader, source)
  gl.compileShader(shader)
  if (!gl.getShaderParameter(shader, gl.COMPILE_STATUS)) {
    gl.deleteShader(shader)
    return null
  }
  return shader
}

export function VibeHeroCanvas() {
  const canvasRef = useRef<HTMLCanvasElement>(null)

  useEffect(() => {
    const canvas = canvasRef.current
    if (!canvas) {
      return
    }
    const parent = canvas.parentElement
    if (!parent) {
      return
    }

    const reduceMotion = window.matchMedia(
      "(prefers-reduced-motion: reduce)"
    ).matches

    const gl = (canvas.getContext("webgl", {
      alpha: true,
      premultipliedAlpha: true,
      antialias: false,
    }) ||
      canvas.getContext("experimental-webgl", {
        alpha: true,
      })) as WebGLRenderingContext | null
    if (!gl) {
      return
    }

    const vertexShader = compileShader(gl, gl.VERTEX_SHADER, VERTEX_SHADER)
    const fragmentShader = compileShader(
      gl,
      gl.FRAGMENT_SHADER,
      FRAGMENT_SHADER
    )
    if (!vertexShader || !fragmentShader) {
      return
    }

    const program = gl.createProgram()
    if (!program) {
      return
    }
    gl.attachShader(program, vertexShader)
    gl.attachShader(program, fragmentShader)
    gl.linkProgram(program)
    if (!gl.getProgramParameter(program, gl.LINK_STATUS)) {
      return
    }

    gl.useProgram(program)
    gl.enable(gl.BLEND)
    gl.blendFunc(gl.ONE, gl.ONE_MINUS_SRC_ALPHA)
    gl.clearColor(0, 0, 0, 0)

    const buffer = gl.createBuffer()
    gl.bindBuffer(gl.ARRAY_BUFFER, buffer)
    gl.bufferData(
      gl.ARRAY_BUFFER,
      new Float32Array([-1, -1, 1, -1, -1, 1, -1, 1, 1, -1, 1, 1]),
      gl.STATIC_DRAW
    )
    const aPosition = gl.getAttribLocation(program, "a_position")
    gl.enableVertexAttribArray(aPosition)
    gl.vertexAttribPointer(aPosition, 2, gl.FLOAT, false, 0, 0)

    const uResolution = gl.getUniformLocation(program, "u_resolution")
    const uMouse = gl.getUniformLocation(program, "u_mouse")
    const uTime = gl.getUniformLocation(program, "u_time")
    const uMotion = gl.getUniformLocation(program, "u_motion")

    // Smoothed pointer: target (tx/ty) is set on move; current (x/y) eases in.
    const mouse = { x: 0.5, y: 0.5, tx: 0.5, ty: 0.5 }

    const resize = () => {
      const dpr = Math.min(window.devicePixelRatio || 1, 2)
      const rect = parent.getBoundingClientRect()
      const w = Math.max(1, Math.floor(rect.width * dpr))
      const h = Math.max(1, Math.floor(rect.height * dpr))
      if (canvas.width !== w || canvas.height !== h) {
        canvas.width = w
        canvas.height = h
        gl.viewport(0, 0, w, h)
      }
    }

    let rafId = 0
    let startTime = 0

    const render = (now: number) => {
      if (!startTime) {
        startTime = now
      }
      const t = (now - startTime) / 1000

      mouse.x += (mouse.tx - mouse.x) * 0.12
      mouse.y += (mouse.ty - mouse.y) * 0.12

      if (uResolution) {
        gl.uniform2f(uResolution, gl.drawingBufferWidth, gl.drawingBufferHeight)
      }
      if (uMouse) {
        gl.uniform2f(uMouse, mouse.x, mouse.y)
      }
      if (uTime) {
        gl.uniform1f(uTime, t)
      }
      if (uMotion) {
        gl.uniform1f(uMotion, reduceMotion ? 0 : 1)
      }

      gl.clear(gl.COLOR_BUFFER_BIT)
      gl.drawArrays(gl.TRIANGLES, 0, 6)

      if (!reduceMotion) {
        rafId = window.requestAnimationFrame(render)
      }
    }

    const handlePointerMove = (event: PointerEvent) => {
      const rect = parent.getBoundingClientRect()
      mouse.tx = (event.clientX - rect.left) / rect.width
      mouse.ty = (event.clientY - rect.top) / rect.height
    }

    resize()

    const resizeObserver = new ResizeObserver(() => {
      resize()
      if (reduceMotion) {
        render(0)
      }
    })
    resizeObserver.observe(parent)

    if (!reduceMotion) {
      parent.addEventListener("pointermove", handlePointerMove, {
        passive: true,
      })
    }
    rafId = window.requestAnimationFrame(render)

    return () => {
      if (rafId) {
        window.cancelAnimationFrame(rafId)
      }
      resizeObserver.disconnect()
      parent.removeEventListener("pointermove", handlePointerMove)
      // Intentionally NOT calling WEBGL_lose_context here: a canvas exposes a
      // single GL context, and under React StrictMode (dev) the effect runs
      // setup → cleanup → setup. Losing the context in cleanup would leave the
      // re-run setup reusing a dead context, rendering nothing.
    }
  }, [])

  return (
    <canvas
      ref={canvasRef}
      aria-hidden
      className="pointer-events-none absolute inset-0 z-0 h-full w-full"
    />
  )
}
