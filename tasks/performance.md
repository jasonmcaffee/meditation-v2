# Performance Report: Ring + Comet Animation (Skia)

## Measurement Method

- Device: Android Emulator (`Medium_Phone_API_36.0`, 1080×2400, API 36, software/SwiftShader GPU)
- Tool: `adb -s emulator-5554 shell dumpsys gfxinfo com.jasonmcaffee.meditation`
- Renderer: **@shopify/react-native-skia v2.4.2** (GPU canvas), all animation on the
  Reanimated UI thread via `useFrameCallback` (zero JS-thread work per frame)

---

## Results — Running (blobs + orbiting dot + live particle comet)

Captured over ~8s of continuous animation with the timer running:

| Metric | Value |
|--------|-------|
| Total frames | 457 (~57 fps avg) |
| Janky frames (modern) | **6.78%** (31/457) |
| 50th percentile frame time | 21ms |
| 90th percentile frame time | 32ms |
| 95th percentile frame time | 40ms |
| 99th percentile frame time | 97ms |
| Missed Vsync | 13 |
| GPU 50th percentile | 1ms |
| GPU 90th percentile | 19ms |
| GPU 99th percentile | 25ms |

> The "legacy" janky metric reads ~99% on this emulator regardless of workload — it is
> an unreliable software-rendering artifact. The **modern janky metric (6.78%)** and the
> frame-time percentiles are the meaningful numbers.

This is a large improvement over the previous SVG implementation (which showed 83% jank
and an 85ms median frame time while running).

---

## Root Cause Analysis

### Emulator caveat (critical)
The emulator renders with software GPU (SwiftShader). Despite that, GPU times are tiny
(1–25ms) — Skia composites the blobs, additive particle paths and glow cheaply. **Real
device numbers will be better still**, as the GPU work moves to real hardware.

### Per-frame work (UI thread)
Each frame, one `useFrameCallback` worklet:
1. Advances animation/head phases.
2. Simulates the particle comet — advance + cull up to ~1,200 particles (life, angular &
   radial drift, damping), then spawn 7/frame (running) or 1/frame (rest), then cap.
3. `useDerivedValue` rebuilds 7 blob path strings (48 steps × 2 passes) **and** 8
   alpha-bucketed Skia `Path` objects (`addCircle` per live particle — no string parsing).

### Render tree (GPU, Skia)
- Background radial gradient
- 7 blobs × 2 passes (blurred glow + crisp core) = 14 `Path`, `BlendMode.Screen`
- Dark core gradient + faint base ring
- 8 comet bucket `Path`s, `BlendMode.Plus` (additive — overlapping dots brighten the head)
- Head glow (blurred circle) + bright core circle

### Key findings
1. **GPU is not the bottleneck** (1–25ms). Cost is the CPU particle sim + path build.
2. **Bucketed particles are the key optimization** — instead of 1,200 individual `<Circle>`
   nodes (impossible at 60fps), particles are binned into 8 opacity buckets, each one
   `Path` rendered additively. 8 draw calls instead of 1,200.
3. **Skia `addCircle` beats SVG string building** — no per-frame string allocation/parsing
   for the comet.

---

## Optimizations Applied

| Change | Impact |
|--------|--------|
| SVG → Skia GPU canvas | Real blend modes & blur on GPU; jank 83% → 6.78% |
| All animation on `useFrameCallback` (UI thread) | No JS-thread bottleneck; play is instant |
| Comet binned into 8 additive `Path` buckets | 8 draw calls vs 1,200 circle nodes |
| `Skia.Path.addCircle` (no SVG string parse) for particles | Cheaper per-frame build |
| `STEPS = 48` for blobs | Smooth ribbon at low per-frame cost |
| Particle cap `COMET_CAP = 1200` (orig 2400) | Bounds worst-case sim cost on mobile |
| `dt` clamp (≤50ms) | No physics blow-up on frame hitches |

---

## Estimated Real-Device Performance

| Metric | Emulator (measured) | Est. real device |
|--------|--------------------|--------------------|
| Frame time (50th pct) | 21ms | ~10–14ms |
| Frame rate | ~57fps | ~60fps (capped) |
| Jank rate (modern) | 6.78% | ~1–4% |
| GPU time (90th pct) | 19ms | ~3–6ms |

Expect a solid 60fps on a mid-range 2023+ Android device.

---

## Further Optimizations (if ever needed on low-end devices)

1. Lower `COMET_CAP` to ~800 — fewer trail particles, slightly shorter tail.
2. Spawn 2+3 particles/frame instead of 3+4 — thinner trail, less sim cost.
3. Reduce blob `STEPS` to 36 — barely visible quality drop.
4. Drop the blob glow pass (single crisp pass only) on a "reduced motion / low power" flag.

---

## Measurement Commands

```bash
adb -s emulator-5554 shell dumpsys gfxinfo com.jasonmcaffee.meditation reset
# ...let it animate ~8s...
adb -s emulator-5554 shell dumpsys gfxinfo com.jasonmcaffee.meditation \
  | grep -E "Total frames|Janky frames|percentile|Missed Vsync"
```
