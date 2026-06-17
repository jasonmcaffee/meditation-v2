import React, {useEffect, useState} from 'react';
import {LayoutChangeEvent, Pressable, Text, View, StyleSheet} from 'react-native';
import Page from "../../common-components/Page";
import timePage from "../../services/timePage";
import FinishSessionModal from "./FinishSessionModal";
import SoundSettingsModal from "./SoundSettingsModal";
import appEventBus from "../../services/appEventBus";
import createUnregisterFunction from "../../react-utils/createUnregisterFunction";
import TrackModalSelector from "../../common-components/TrackModalSelector";
import ConcentricRingsTimer from "../../common-components/ConcentricRingsTimer";
import MaterialCommunityIcons from "react-native-vector-icons/MaterialCommunityIcons";
import AlarmTimeModal from "./AlarmTimeModal";

/**
 * Main meditation timer page. Layout matches new-design.html exactly:
 * alarm pills → rings canvas (flex:1) → track selector → 88×88 circle buttons.
 */
function TimePage() {
    const state = timePage.usePageState();
    const alarmMinutes = timePage.useAlarmMinutes();
    const {hours, minutes} = convertMinutesToHoursAndMinutes(alarmMinutes);
    const [containerSize, setContainerSize] = useState({width: 0, height: 0});

    const finishSessionModal = state.shouldDisplayFinishSessionModal && state.meditationSession
        ? <FinishSessionModal
              meditationSession={state.meditationSession}
              onCloseClick={() => state.shouldDisplayFinishSessionModal = false}
              onSaveClick={(notes, rating, media) => timePage.saveSession(notes, rating, media)}
          />
        : null;
    const soundSettingsModal = state.shouldDisplaySoundSettingsModal
        ? <SoundSettingsModal onCloseClick={() => state.shouldDisplaySoundSettingsModal = false}/>
        : null;
    const alarmTimeModal = state.shouldDisplayAlarmTimeModal
        ? <AlarmTimeModal
              hours={hours}
              minutes={minutes}
              onCloseClick={() => state.shouldDisplayAlarmTimeModal = false}
          />
        : null;

    // A non-zero alarm means a time is selected → bell fully opaque; otherwise dim.
    const isAlarmTimeSelected = alarmMinutes > 0;

    useEffect(() => {
        return createUnregisterFunction(
            appEventBus.stopwatch.durationUpdate().on(d => state.durationData = d),
            appEventBus.stopwatch.isRunning().on(r => state.isStopWatchRunning = r),
        );
    }, []);

    function onLayout(e: LayoutChangeEvent) {
        const {width, height} = e.nativeEvent.layout;
        setContainerSize({width, height});
    }

    return (
        <Page pageName={'Timer'} modal={finishSessionModal || soundSettingsModal || alarmTimeModal}>
            <View style={styles.root}>
                {/* Ring canvas — flex:1, measured via onLayout */}
                <View style={styles.canvasArea} onLayout={onLayout}>
                    {containerSize.width > 0 && (
                        <ConcentricRingsTimer
                            durationData={state.durationData}
                            canvasWidth={containerSize.width}
                            canvasHeight={containerSize.height}
                            isRunning={state.isStopWatchRunning}
                            elapsedMs={state.durationData.durationMs}
                        />
                    )}
                </View>

                {/* Bottom controls — matches design padding exactly */}
                <View style={styles.bottomSection}>
                    {/* Bell (opens alarm time modal) + track selector */}
                    <View style={styles.audioRow}>
                        <Pressable
                            testID="alarm-time-button"
                            onPress={() => state.shouldDisplayAlarmTimeModal = true}
                            style={({pressed}) => [styles.bellBtn, pressed && styles.btnPressed]}
                        >
                            <MaterialCommunityIcons
                                name="bell-outline"
                                size={20}
                                color={isAlarmTimeSelected ? 'rgba(255,255,255,0.9)' : 'rgba(255,255,255,0.3)'}
                            />
                        </Pressable>
                        <TrackModalSelector
                            options={timePage.scheduledTrackOptions}
                            currentOption={state.selectedScheduledTrackOption}
                            onOptionRowClick={o => timePage.setSelectedScheduledTrackOption(o)}
                        />
                    </View>
                    {/* 88×88 circle buttons, 44px gap */}
                    <View style={styles.buttonsRow}>
                        <Pressable
                            testID="start-pause-button"
                            onPress={() => timePage.startPauseStopwatch()}
                            style={({pressed}) => [styles.circleBtn, styles.playBtn, pressed && styles.btnPressed]}
                        >
                            <MaterialCommunityIcons
                                name={state.isStopWatchRunning ? 'pause' : 'play'}
                                size={30}
                                color="rgba(255,255,255,0.9)"
                            />
                        </Pressable>
                        <Pressable
                            testID="finish-button"
                            onPress={() => timePage.finishSession()}
                            style={({pressed}) => [styles.circleBtn, styles.finishBtn, pressed && styles.btnPressed]}
                        >
                            <Text style={styles.finishText}>Finish</Text>
                        </Pressable>
                    </View>
                </View>
            </View>
        </Page>
    );
}

function convertMinutesToHoursAndMinutes(minutes: number) {
    return {hours: Math.floor(minutes / 60), minutes: minutes % 60};
}

const styles = StyleSheet.create({
    root: {
        flex: 1,
        flexDirection: 'column',
    },
    // Bell + audio selector row
    audioRow: {
        flexDirection: 'row',
        alignItems: 'center',
        justifyContent: 'center',
        alignSelf: 'stretch',
        gap: 10,
    },
    // Bell button — same height as the audio pill, opens the alarm time modal
    bellBtn: {
        width: 46,
        height: 46,
        borderRadius: 15,
        alignItems: 'center',
        justifyContent: 'center',
        backgroundColor: 'rgba(255,255,255,0.024)',
        borderWidth: 1,
        borderColor: 'rgba(255,255,255,0.09)',
    },
    // Canvas area
    canvasArea: {
        flex: 1,
    },
    // Bottom — "padding: 0 22px 8px"
    bottomSection: {
        paddingHorizontal: 22,
        paddingBottom: 8,
        alignItems: 'center',
        gap: 0,
    },
    // Buttons row — "gap: 44px; margin-top: 26px"
    buttonsRow: {
        flexDirection: 'row',
        alignItems: 'center',
        justifyContent: 'center',
        gap: 44,
        marginTop: 26,
    },
    // Both buttons: 88×88 circle (matching design exactly)
    circleBtn: {
        width: 88,
        height: 88,
        borderRadius: 44,
        alignItems: 'center',
        justifyContent: 'center',
    },
    playBtn: {
        backgroundColor: 'rgba(255,255,255,0.06)',
        borderWidth: 1,
        borderColor: 'rgba(255,255,255,0.16)',
    },
    finishBtn: {
        backgroundColor: 'rgba(255,255,255,0.024)',
        borderWidth: 1,
        borderColor: 'rgba(255,255,255,0.13)',
    },
    btnPressed: {
        transform: [{scale: 0.97}],
    },
    finishText: {
        fontFamily: 'Montserrat',
        fontSize: 14,
        fontWeight: '400',
        color: 'rgba(255,255,255,0.85)',
    },
});

export default TimePage;
