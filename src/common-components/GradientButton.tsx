import React, {useState} from 'react';
import {LayoutChangeEvent, Pressable, StyleSheet, Text} from 'react-native';
import {Canvas, LinearGradient, RoundedRect, vec} from '@shopify/react-native-skia';
import appEventBus from '../services/appEventBus';

type Props = {
    text: string;
    onClick?: () => void;
    testID?: string;
};

const HEIGHT = 54;
// Subdued aurora — desaturated slate-blue → muted indigo → dusty mauve. Echoes the
// rings' hues but kept soft and calm to suit the app's meditative, low-key mood.
const GRADIENT = ['#3a4f6b', '#4f4a73', '#6a4f68'];

/**
 * Primary action button painted with the app's aurora gradient via Skia, topped
 * with a soft white sheen and a glassy border so it feels part of the same world
 * as the timer rings. Fires haptic feedback on press.
 * @param text - button label
 * @param onClick - press handler
 */
function GradientButton({text, onClick, testID}: Props) {
    const [width, setWidth] = useState(0);

    function onLayout(e: LayoutChangeEvent) {
        setWidth(e.nativeEvent.layout.width);
    }

    function handlePress() {
        appEventBus.hapticFeedback.heavy().set(true);
        onClick && onClick();
    }

    return (
        <Pressable
            testID={testID}
            onPress={handlePress}
            onLayout={onLayout}
            style={({pressed}) => [styles.button, pressed && styles.pressed]}
        >
            {width > 0 && (
                <Canvas style={StyleSheet.absoluteFill} pointerEvents="none">
                    <RoundedRect x={0} y={0} width={width} height={HEIGHT} r={HEIGHT / 2}>
                        <LinearGradient start={vec(0, 0)} end={vec(width, 0)} colors={GRADIENT}/>
                    </RoundedRect>
                    {/* top sheen — a whisper of highlight along the upper edge */}
                    <RoundedRect x={0} y={0} width={width} height={HEIGHT} r={HEIGHT / 2}>
                        <LinearGradient
                            start={vec(0, 0)}
                            end={vec(0, HEIGHT)}
                            colors={['rgba(255,255,255,0.12)', 'rgba(255,255,255,0)']}
                            positions={[0, 0.55]}
                        />
                    </RoundedRect>
                    {/* glassy border drawn in Skia (inset 0.5px so the stroke isn't
                        clipped at the canvas edge) — replaces the RN border, which
                        otherwise shrank the canvas and darkened the right/bottom edges. */}
                    <RoundedRect
                        x={0.5} y={0.5} width={width - 1} height={HEIGHT - 1} r={(HEIGHT - 1) / 2}
                        style="stroke" strokeWidth={1} color="rgba(255,255,255,0.12)"
                    />
                </Canvas>
            )}
            <Text style={styles.text}>{text}</Text>
        </Pressable>
    );
}

const styles = StyleSheet.create({
    button: {
        height: HEIGHT,
        borderRadius: HEIGHT / 2,
        alignItems: 'center',
        justifyContent: 'center',
        alignSelf: 'stretch',
        overflow: 'hidden',
    },
    pressed: {
        transform: [{scale: 0.98}],
        opacity: 0.95,
    },
    text: {
        fontFamily: 'Montserrat',
        fontSize: 18,
        fontWeight: '600',
        letterSpacing: 0.5,
        color: '#ffffff',
    },
});

export default GradientButton;
