import React from 'react';
import {Canvas, Group, LinearGradient, Path, vec} from '@shopify/react-native-skia';

type StarType = 'full' | 'half' | 'empty';
type Props = {index: number; size: number; color: string; type: StarType};

// Subdued aurora — soft, desaturated slate-blue → muted lavender. Calm rather
// than vivid, to match the app's understated mood and the gradient Save button.
const FILL = ['#5f7693', '#7e7196'];
const EMPTY = 'rgba(255,255,255,0.12)';

/**
 * Builds an SVG path string for a centred five-pointed star.
 * @param size - the width/height the star is drawn within
 */
function starPath(size: number): string {
    const cx = size / 2, cy = size / 2;
    const outer = (size / 2) * 0.96;
    const inner = outer * 0.42;
    const step = Math.PI / 5;
    let rot = -Math.PI / 2;
    let d = '';
    for (let i = 0; i < 5; i++) {
        let x = cx + Math.cos(rot) * outer, y = cy + Math.sin(rot) * outer;
        d += (i === 0 ? 'M' : 'L') + x.toFixed(2) + ',' + y.toFixed(2) + ' ';
        rot += step;
        x = cx + Math.cos(rot) * inner; y = cy + Math.sin(rot) * inner;
        d += 'L' + x.toFixed(2) + ',' + y.toFixed(2) + ' ';
        rot += step;
    }
    return d + 'Z';
}

/**
 * Custom star icon for the rating widget. Renders each star as a Skia path filled
 * with the app's aurora gradient (so the rating matches the timer's colour palette).
 * Empty stars are a faint glass fill; half stars clip the gradient to the left edge.
 * @param size - star size in px
 * @param type - 'full' | 'half' | 'empty' fill state from the rating widget
 */
function GradientStar({size, type}: Props) {
    const d = starPath(size);
    const gradient = (
        <LinearGradient start={vec(0, size)} end={vec(size, 0)} colors={FILL}/>
    );
    return (
        <Canvas style={{width: size, height: size}}>
            {/* faint base so empty stars stay visible but understated */}
            <Path path={d} color={EMPTY}/>
            {type === 'full' && <Path path={d}>{gradient}</Path>}
            {type === 'half' && (
                <Group clip={{x: 0, y: 0, width: size / 2, height: size}}>
                    <Path path={d}>{gradient}</Path>
                </Group>
            )}
        </Canvas>
    );
}

export default GradientStar;
