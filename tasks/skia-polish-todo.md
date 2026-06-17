# Skia Polish TODO

## Issues to fix
- [x] Lock emulator to emulator-5554 in package.json android script
- [x] Extract EXACT particle physics + render from new-design.html
- [x] Replace deterministic buildComet with real stateful particle system (shared-value array, mutated each frame)
- [x] Spawn faithfully: running = 3 bright cluster + 4 backward-trailing/frame; rest = 1 shimmer/frame
- [x] Physics: life-=dt, ang+=angVel*dt, r+=rVel*dt, rVel*=0.96; splice dead; cap array
- [x] Render as hundreds of TINY additive dots (size 0.25-1.4px) via alpha-bucketed Skia paths + BlendMode.Plus — NO giant glow circles
- [x] Head: soft blurred glow + bright core = the luminous dot (hr=13 running / 9+pulse*2 rest)
- [x] Blobs: two-pass (blurred glow + crisp ribbon core) — matches canvas shadowBlur, vivid ribbons
- [x] Reset particles when timer restarts (elapsedMs<500)
- [x] Rebuild --deviceId emulator-5554, screenshot rest + running vs design — strong parity confirmed
- [x] Measure performance (gfxinfo) and update tasks/performance.md — 6.78% jank, ~57fps
- [x] Jest suite green (25/25)
