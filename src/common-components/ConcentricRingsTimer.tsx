import React, {useEffect} from 'react';
import {StyleSheet, Text, View} from 'react-native';
import {
    BlendMode,
    BlurMask,
    Canvas,
    Circle,
    Group,
    Path,
    RadialGradient,
    Skia,
    vec,
} from '@shopify/react-native-skia';
import {
    useDerivedValue,
    useFrameCallback,
    useSharedValue,
} from 'react-native-reanimated';
import {IDurationUpdateData} from '../services/stopwatch';

// ─── Aurora palette (exact from new-design.html) ─────────────────────────────
const AURORA: [number, number, number][] = [
    [214,  76, 140],
    [224,  73,  47],
    [239, 116,  64],
    [ 58, 111, 216],
    [ 41, 182, 216],
    [124,  92, 208],
    [150, 196, 238],
];

interface BlobDef {
    ci: number; cphase: number; cspeed: number; corbit: number;
    baseR: number; w1: number; w2: number; a1: number; a2: number;
    wphase: number; wspeed: number; rot: number; rotSpeed: number;
    alpha: number; wMax: number; wk: number; wphase2: number; wdriftSpeed: number;
}

const BLOBS: BlobDef[] = [
    {ci:0, cphase:0.52, cspeed:0.025, corbit:10, baseR:88,  w1:2, w2:5, a1:14, a2:7,  wphase:1.20, wspeed:0.18, rot:0.8, rotSpeed: 0.022, alpha:0.19, wMax: 8, wk:2, wphase2:0.30, wdriftSpeed: 0.08},
    {ci:1, cphase:1.80, cspeed:0.035, corbit:14, baseR:105, w1:3, w2:4, a1:11, a2:5,  wphase:2.50, wspeed:0.22, rot:2.1, rotSpeed:-0.028, alpha:0.21, wMax:11, wk:1, wphase2:1.80, wdriftSpeed:-0.12},
    {ci:2, cphase:3.40, cspeed:0.020, corbit: 8, baseR:120, w1:2, w2:6, a1:16, a2:8,  wphase:0.70, wspeed:0.15, rot:4.2, rotSpeed: 0.018, alpha:0.16, wMax: 9, wk:3, wphase2:2.50, wdriftSpeed: 0.10},
    {ci:3, cphase:5.10, cspeed:0.042, corbit:12, baseR:95,  w1:3, w2:5, a1:13, a2:6,  wphase:3.80, wspeed:0.20, rot:1.5, rotSpeed:-0.032, alpha:0.22, wMax: 7, wk:2, wphase2:0.90, wdriftSpeed:-0.07},
    {ci:4, cphase:0.90, cspeed:0.030, corbit:16, baseR:82,  w1:2, w2:4, a1:18, a2:9,  wphase:1.50, wspeed:0.25, rot:3.7, rotSpeed: 0.025, alpha:0.24, wMax:12, wk:1, wphase2:3.20, wdriftSpeed: 0.14},
    {ci:5, cphase:2.30, cspeed:0.038, corbit: 9, baseR:112, w1:3, w2:5, a1:10, a2:4,  wphase:5.20, wspeed:0.12, rot:0.3, rotSpeed:-0.020, alpha:0.20, wMax:10, wk:3, wphase2:1.50, wdriftSpeed:-0.09},
    {ci:6, cphase:4.50, cspeed:0.022, corbit:13, baseR:100, w1:2, w2:6, a1:15, a2:7,  wphase:0.40, wspeed:0.17, rot:5.8, rotSpeed: 0.030, alpha:0.23, wMax: 8, wk:2, wphase2:4.10, wdriftSpeed: 0.06},
];

const DESIGN_SIZE = 360;
const BASE_R      = 125;   // ring radius in design units (R in new-design.html)
const CORE_R      = 92;
const STEPS       = 80;    // higher segment count → smoother blob contour
const BUCKETS     = 8;     // alpha buckets for additive particle render
const COMET_CAP   = 1200;  // max live particles (orig 2400; capped lower for mobile)

type Props = {
    durationData: IDurationUpdateData;
    canvasWidth: number;
    canvasHeight: number;
    isRunning: boolean;
    elapsedMs: number;
};

/**
 * GPU-accelerated ring + comet animation using @shopify/react-native-skia.
 * Faithfully reproduces new-design.html: a stateful particle trail of hundreds of
 * tiny additive white dots that spawn at the head, drift, decay and fade. All physics
 * runs on the Reanimated UI thread (useFrameCallback) — zero JS-thread work per frame.
 */
function ConcentricRingsTimer({durationData, canvasWidth, canvasHeight, isRunning, elapsedMs}: Props) {
    const svAp       = useSharedValue(0);                    // aurora/animation phase
    const svT        = useSharedValue(0);                    // wall-clock seconds (for pulse)
    const svHead     = useSharedValue(-Math.PI / 2);         // dot angle around ring
    const svRunning  = useSharedValue(isRunning ? 1 : 0);
    const svReset    = useSharedValue(0);
    const svCx       = useSharedValue(canvasWidth / 2);
    const svCy       = useSharedValue(canvasHeight / 2);
    const svScale    = useSharedValue(canvasWidth / DESIGN_SIZE);
    const particles  = useSharedValue<number[]>([]);         // flat [ang,r,angVel,rVel,life,max,size,br, ...]

    useEffect(() => {
        const s = canvasWidth / DESIGN_SIZE;
        const top = 55 * s, bot = 130 * s;
        svCx.value    = canvasWidth / 2;
        svCy.value    = top + (canvasHeight - top - bot) * 0.44;
        svScale.value = s;
    }, [canvasWidth, canvasHeight]);

    useEffect(() => { svRunning.value = isRunning ? 1 : 0; }, [isRunning]);
    useEffect(() => { if (elapsedMs < 500) { svHead.value = -Math.PI / 2; svReset.value = 1; } }, [elapsedMs < 500]);

    // ── Single per-frame worklet: advance phases, simulate + spawn particles ──
    useFrameCallback(({timeSincePreviousFrame}) => {
        'worklet';
        const dt = timeSincePreviousFrame ? Math.min(timeSincePreviousFrame / 1000, 0.05) : 0.016;
        svT.value  = svT.value + dt;
        svAp.value = svAp.value + dt * (svRunning.value ? 0.63 : 0.45);
        const running = svRunning.value;
        if (running) svHead.value = svHead.value + dt * (Math.PI * 2 / 60);

        const arr = particles.value;
        if (svReset.value) { arr.length = 0; svReset.value = 0; }

        const head = svHead.value;
        const R = BASE_R;                 // design units; scaled at render time
        const jit = () => (Math.random() - 0.5);

        // 1) advance + cull existing particles (8 floats per particle)
        for (let i = arr.length - 8; i >= 0; i -= 8) {
            arr[i + 4] -= dt;             // life
            if (arr[i + 4] <= 0) { arr.splice(i, 8); continue; }
            arr[i]     += arr[i + 2] * dt; // ang += angVel*dt
            arr[i + 1] += arr[i + 3] * dt; // r += rVel*dt
            arr[i + 3] *= 0.96;            // rVel damping
        }

        // 2) spawn new particles (exact counts/params from new-design.html)
        const push = (ang: number, r: number, angVel: number, rVel: number, life: number, max: number, size: number, br: number) => {
            arr.push(ang, r, angVel, rVel, life, max, size, br);
        };
        if (running) {
            for (let k = 0; k < 3; k++) {  // bright tight cluster = the dot head
                push(head + jit() * 0.02, R + jit() * 3.5, jit() * 0.03, jit() * 2,
                     1.1 + Math.random() * 1.2, 2.3, 0.5 + Math.random() * 0.9, 0.95);
            }
            for (let k = 0; k < 4; k++) {  // small particles trailing backward along the ring
                push(head + jit() * 0.03, R + jit() * 3, -(0.05 + Math.random() * 0.12), jit() * 1.0,
                     5 + Math.random() * 5, 10, 0.25 + Math.random() * 0.75, 0.45 + Math.random() * 0.4);
            }
        } else {                            // gentle shimmer at the resting dot
            push(head + jit() * 0.05, R + jit() * 3.5, jit() * 0.02, jit() * 1.0,
                 1.4 + Math.random() * 1.4, 2.8, 0.4 + Math.random() * 0.8, 0.7);
        }

        // 3) cap
        if (arr.length > COMET_CAP * 8) arr.splice(0, arr.length - COMET_CAP * 8);
    });

    // ── Aurora blob paths (7) ─────────────────────────────────────────────────
    const p0 = useDerivedValue(() => blobPath(BLOBS[0], svAp.value, svCx.value, svCy.value, svScale.value));
    const p1 = useDerivedValue(() => blobPath(BLOBS[1], svAp.value, svCx.value, svCy.value, svScale.value));
    const p2 = useDerivedValue(() => blobPath(BLOBS[2], svAp.value, svCx.value, svCy.value, svScale.value));
    const p3 = useDerivedValue(() => blobPath(BLOBS[3], svAp.value, svCx.value, svCy.value, svScale.value));
    const p4 = useDerivedValue(() => blobPath(BLOBS[4], svAp.value, svCx.value, svCy.value, svScale.value));
    const p5 = useDerivedValue(() => blobPath(BLOBS[5], svAp.value, svCx.value, svCy.value, svScale.value));
    const p6 = useDerivedValue(() => blobPath(BLOBS[6], svAp.value, svCx.value, svCy.value, svScale.value));
    const blobPaths = [p0, p1, p2, p3, p4, p5, p6];

    // ── Comet: one pass builds all alpha buckets as Skia paths (rebuilt each frame) ──
    const svBuckets = useDerivedValue(() => {
        'worklet';
        svAp.value; // subscribe → recompute every frame
        return buildBuckets(particles.value, svCx.value, svCy.value, svScale.value);
    });
    const b0 = useDerivedValue(() => svBuckets.value[0]);
    const b1 = useDerivedValue(() => svBuckets.value[1]);
    const b2 = useDerivedValue(() => svBuckets.value[2]);
    const b3 = useDerivedValue(() => svBuckets.value[3]);
    const b4 = useDerivedValue(() => svBuckets.value[4]);
    const b5 = useDerivedValue(() => svBuckets.value[5]);
    const b6 = useDerivedValue(() => svBuckets.value[6]);
    const b7 = useDerivedValue(() => svBuckets.value[7]);
    const bucketPaths = [b0, b1, b2, b3, b4, b5, b6, b7];

    // ── Head halo (radial-gradient glow = the luminous dot) ───────────────────
    const hx = useDerivedValue(() => svCx.value + Math.cos(svHead.value) * BASE_R * svScale.value);
    const hy = useDerivedValue(() => svCy.value + Math.sin(svHead.value) * BASE_R * svScale.value);
    const haloR = useDerivedValue(() => {
        'worklet';
        const pulse = 0.5 + 0.5 * Math.sin(svT.value * 0.6);
        return (svRunning.value ? 13 : 9 + pulse * 2) * svScale.value;
    });
    const haloCoreR = useDerivedValue(() => (svRunning.value ? 4.5 : 3.5) * svScale.value);

    // Static layout values (computed once per render)
    const scale = canvasWidth / DESIGN_SIZE;
    const cx    = canvasWidth / 2;
    const top   = 55 * scale;
    const cy    = top + (canvasHeight - top - 130 * scale) * 0.44;
    const coreR = CORE_R * scale;
    const ringR = BASE_R * scale;
    const fontSize  = Math.round(52 * scale);
    const charW     = Math.round(36 * scale);
    const blobBlur  = 5 * scale;   // glow halo around the crisp ribbon core (design shadowBlur=7)
    const crispBlur = 2.2 * scale; // gentle smoothing of the filled blob edges
    const timeChars = durationData.formattedDuration.split('');

    return (
        <View style={[styles.canvas, {width: canvasWidth, height: canvasHeight}]}>
            <Canvas style={{width: canvasWidth, height: canvasHeight}}>
                {/* No opaque background here — the canvas is transparent so the
                    app-wide GradientBackground shows through, letting the timer
                    blend seamlessly into the surfaces above and below it. */}

                {/* Aurora blobs — glow pass (blurred halo) then crisp ribbon core.
                    Two passes reproduce canvas shadowBlur: solid ribbon + surrounding glow. */}
                {BLOBS.map((b, i) => {
                    const [r, g, bl] = AURORA[b.ci % AURORA.length];
                    return (
                        <Path key={`g${i}`} path={blobPaths[i]} color={`rgba(${r},${g},${bl},${b.alpha})`} blendMode={BlendMode.Screen}>
                            <BlurMask blur={blobBlur} style="normal" respectCTM={false}/>
                        </Path>
                    );
                })}
                {BLOBS.map((b, i) => {
                    const [r, g, bl] = AURORA[b.ci % AURORA.length];
                    return (
                        <Path key={`c${i}`} path={blobPaths[i]} color={`rgba(${r},${g},${bl},${b.alpha})`} blendMode={BlendMode.Screen}>
                            {/* small blur softens the polygon facets → smooth blob edges */}
                            <BlurMask blur={crispBlur} style="normal" respectCTM={false}/>
                        </Path>
                    );
                })}

                {/* Dark core — keeps timer text readable */}
                <Circle cx={cx} cy={cy} r={coreR}>
                    <RadialGradient
                        c={vec(cx, cy)} r={coreR}
                        colors={['rgba(9,10,14,0.94)', 'rgba(9,10,14,0.70)', 'rgba(9,10,14,0)']}
                        positions={[0, 0.5, 1]}
                    />
                </Circle>

                {/* Faint base ring */}
                <Circle cx={cx} cy={cy} r={ringR} color="rgba(255,255,255,0.10)" style="stroke" strokeWidth={1}/>

                {/* ── Comet trail: hundreds of tiny additive dots, bucketed by opacity ── */}
                {bucketPaths.map((bp, i) => (
                    <Path
                        key={i}
                        path={bp}
                        color="white"
                        blendMode={BlendMode.Plus}
                        opacity={((i + 0.5) / BUCKETS) * 0.6}
                    />
                ))}

                {/* Head halo — soft glow + bright core = the luminous dot */}
                <Group blendMode={BlendMode.Plus}>
                    <Circle cx={hx} cy={hy} r={haloR} color="rgba(255,255,255,0.22)">
                        <BlurMask blur={6 * scale} style="normal" respectCTM={false}/>
                    </Circle>
                    <Circle cx={hx} cy={hy} r={haloCoreR} color="rgba(255,255,255,0.8)"/>
                </Group>
            </Canvas>

            {/* Timer text overlay */}
            <View style={[styles.timeBox, {top: cy - fontSize / 2}]} pointerEvents="none">
                <View style={styles.timeRow}>
                    {timeChars.map((c, i) => (
                        <Text key={i} style={[styles.char, {fontSize, width: charW}]}>{c}</Text>
                    ))}
                </View>
            </View>
        </View>
    );
}

// ─── Worklet: comet — build 8 alpha-bucketed Skia paths in one pass ───────────

/**
 * Builds BUCKETS Skia paths of tiny particle circles, grouped by opacity bucket.
 * Each bucket is rendered additively (BlendMode.Plus) so overlapping dots brighten
 * the dense head — reproducing the original 'lighter' compositing without giant blurs.
 * @param arr - flat particle array [ang,r,angVel,rVel,life,max,size,br, ...]
 * @param cx - canvas centre x
 * @param cy - canvas centre y
 * @param s - design→canvas scale
 */
function buildBuckets(arr: number[], cx: number, cy: number, s: number) {
    'worklet';
    const paths = [];
    for (let b = 0; b < BUCKETS; b++) paths.push(Skia.Path.Make());
    if (!s || s <= 0) return paths;

    for (let i = 0; i + 8 <= arr.length; i += 8) {
        const ang = arr[i], r = arr[i + 1], life = arr[i + 4], max = arr[i + 5];
        const size = arr[i + 6], br = arr[i + 7];
        const lf = life / max > 0 ? life / max : 0;
        const al = Math.pow(lf, 0.7) * br;          // raw 0..~1 → choose bucket
        let bi = Math.floor(al * BUCKETS);
        if (bi < 0) bi = 0; else if (bi >= BUCKETS) bi = BUCKETS - 1;

        const px = cx + Math.cos(ang) * r * s;
        const py = cy + Math.sin(ang) * r * s;
        const pr = size * (0.5 + lf * 0.5) * s;
        paths[bi].addCircle(px, py, pr);
    }
    return paths;
}

// ─── Worklet: aurora blob path ────────────────────────────────────────────────

/**
 * Builds the SVG path string for one perturbed aurora blob ring.
 * @param b - blob definition (frequencies, amplitudes, orbit, rotation)
 * @param ap - animation phase
 * @param cx - canvas centre x
 * @param cy - canvas centre y
 * @param s - design→canvas scale
 */
function blobPath(b: BlobDef, ap: number, cx: number, cy: number, s: number): string {
    'worklet';
    if (!s || s <= 0 || !cx || !cy) return 'M0,0Z';
    const ang  = b.cphase + ap * b.cspeed;
    const bx   = cx + Math.cos(ang) * b.corbit * s;
    const by   = cy + Math.sin(ang) * b.corbit * s;
    const rot  = b.rot  + ap * b.rotSpeed;
    const wph  = b.wphase  + ap * b.wspeed;
    const wdr  = b.wphase2 + ap * b.wdriftSpeed;
    const cosr = Math.cos(rot), sinr = Math.sin(rot);
    const PI2  = Math.PI * 2;
    // Single closed contour traced along the band's outer edge → a fully filled
    // solid blob (rather than a thin ribbon/band). The fill color renders the
    // whole disc, so overlapping blobs blend into a filled aurora.
    let d = '';
    for (let i = 0; i <= STEPS; i++) {
        const a   = (i / STEPS) * PI2;
        const cen = (b.baseR + Math.sin(a * b.w1 + wph) * b.a1 + Math.sin(a * b.w2 - wph * 1.3) * b.a2) * s;
        const wid = b.wMax * s * (0.10 + 0.90 * (0.5 + 0.5 * Math.sin(a * b.wk + wdr)));
        const ro  = cen + wid * 0.5;
        const lx  = Math.cos(a) * ro, ly = Math.sin(a) * ro;
        // No integer rounding — sub-pixel vertices avoid the faceted/jagged look.
        d += (i === 0 ? 'M' : 'L') + (lx * cosr - ly * sinr + bx).toFixed(2) + ',' +
             (lx * sinr + ly * cosr + by).toFixed(2) + ' ';
    }
    return d + 'Z';
}

const styles = StyleSheet.create({
    canvas:  {position: 'absolute', top: 0, left: 0},
    timeBox: {position: 'absolute', left: 0, right: 0, alignItems: 'center'},
    timeRow: {flexDirection: 'row', alignItems: 'center', justifyContent: 'center'},
    char: {
        fontFamily: 'Montserrat',
        fontWeight: '200',
        letterSpacing: 2,
        color: '#f3f4f7',
        textAlign: 'center',
        includeFontPadding: false,
    },
});

export default ConcentricRingsTimer;
