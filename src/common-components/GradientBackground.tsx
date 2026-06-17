import React from 'react';
import {StyleSheet, useWindowDimensions} from 'react-native';
import {
    BlendMode,
    Canvas,
    LinearGradient,
    RadialGradient,
    Rect,
    vec,
} from '@shopify/react-native-skia';

/**
 * App-wide background. A subtle near-black vertical gradient with a soft navy
 * radial highlight in the upper third (sitting behind the timer rings) so the
 * whole app shares one cohesive, slightly luminous backdrop. Rendered once
 * behind every page so the timer canvas and the surfaces below it blend
 * seamlessly into the same field of colour.
 */
function GradientBackground() {
    const {width, height} = useWindowDimensions();
    return (
        <Canvas style={[styles.canvas, {width, height}]} pointerEvents="none">
            {/* Base vertical gradient — deep navy at top easing to near-black */}
            <Rect x={0} y={0} width={width} height={height}>
                <LinearGradient
                    start={vec(0, 0)}
                    end={vec(0, height)}
                    colors={['#11141f', '#0b0d15', '#070810']}
                    positions={[0, 0.55, 1]}
                />
            </Rect>
            {/* Soft radial highlight behind the rings — added with Screen so it
                only ever lightens, never banding the dark base. */}
            <Rect x={0} y={0} width={width} height={height} blendMode={BlendMode.Screen}>
                <RadialGradient
                    c={vec(width / 2, height * 0.34)}
                    r={width * 0.95}
                    colors={['rgba(44,62,108,0.55)', 'rgba(28,40,74,0.16)', 'rgba(8,10,18,0)']}
                    positions={[0, 0.5, 1]}
                />
            </Rect>
        </Canvas>
    );
}

const styles = StyleSheet.create({
    canvas: {position: 'absolute', top: 0, left: 0, zIndex: 0},
});

export default GradientBackground;
