import React from "react";
import {StyleSheet, Text, View} from 'react-native';
import Modal from "../../common-components/Modal";
import DropDown from "../../common-components/DropDown";
import timePage from "../../services/timePage";

type Props = {
    hours: number,
    minutes: number,
    onCloseClick?: () => void,
};

/**
 * Dark glassmorphic modal that hosts the alarm hours/minutes dropdowns.
 * Opened from the bell button on the timer page; lets the user pick how long
 * the session should run before the alarm sounds.
 * @param hours - currently selected hours
 * @param minutes - currently selected minutes
 * @param onCloseClick - invoked to dismiss the modal
 */
function AlarmTimeModal({hours, minutes, onCloseClick}: Props) {
    return (
        <Modal onCloseClick={onCloseClick} windowClassName={styles.window}>
            <Text style={styles.title}>Set Timer</Text>
            <View style={styles.pickerRow}>
                <DropDown
                    value={hours}
                    onSelected={h => timePage.setAlarmMinutesFromHoursAndMinutes(h, minutes)}
                    data={timePage.hourOptions}
                    label={"hours"}
                    className={styles.picker}
                    buttonClassName={styles.pickerButton}
                />
                <DropDown
                    value={minutes}
                    onSelected={m => timePage.setAlarmMinutesFromHoursAndMinutes(hours, m)}
                    data={timePage.minuteOptions}
                    label={"min"}
                    className={styles.picker}
                    buttonClassName={styles.pickerButton}
                />
            </View>
        </Modal>
    );
}

const styles = StyleSheet.create({
    window: {
        paddingVertical: 30,
        paddingHorizontal: 24,
    },
    title: {
        fontFamily: 'Montserrat',
        fontSize: 18,
        color: 'rgba(255,255,255,0.85)',
        textAlign: 'center',
        marginBottom: 22,
    },
    pickerRow: {
        flexDirection: 'row',
        justifyContent: 'center',
        alignItems: 'center',
        gap: 14,
    },
    // Each picker takes half the row so both fit inside the modal (the dropdown
    // library defaults the button to half the *screen* width, which overflowed).
    picker: {
        flex: 1,
    },
    pickerButton: {
        width: '100%',
    },
});

export default AlarmTimeModal;
