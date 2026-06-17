import React from "react";
import {Pressable, StyleSheet, Text, View} from "react-native";
import Div from "./Div";
import Modal from "./Modal";
import appEventBus from "../services/appEventBus";
import {IScheduledTrackOption} from "../config/scheduledTracks";
import MaterialCommunityIcons from "react-native-vector-icons/MaterialCommunityIcons";

type OptionRowClick = (option: IScheduledTrackOption) => void;

type Props = {
    options: IScheduledTrackOption[];
    currentOption: IScheduledTrackOption;
    onOptionRowClick?: OptionRowClick;
    className?: any;
};

/**
 * Pill button showing current track with music note icon and chevron.
 * Opens a dark glass modal listing all track options.
 */
function TrackModalSelector({currentOption, options, onOptionRowClick, className}: Props) {
    function handleOptionClick(option: IScheduledTrackOption) {
        appEventBus.app.showModal().set(null);
        appEventBus.hapticFeedback.light().set(true);
        onOptionRowClick && onOptionRowClick(option);
    }

    function openModal() {
        appEventBus.hapticFeedback.light().set(true);
        const modal = (
            <Modal showCloseButton={false} onCloseClick={closeModal}>
                <View style={styles.modalList}>
                    {options.map((o, i) => (
                        <Pressable key={i} style={styles.optionRow} onPress={() => handleOptionClick(o)}>
                            <Text style={styles.optionLabel}>{o.label}</Text>
                            {o.description ? <Text style={styles.optionDesc}>{o.description}</Text> : null}
                        </Pressable>
                    ))}
                </View>
            </Modal>
        );
        appEventBus.app.showModal().set(modal);
    }

    function closeModal() {
        appEventBus.app.showModal().set(null);
    }

    return (
        <Pressable onPress={openModal} style={[styles.selectorPill, className]}>
            <MaterialCommunityIcons name="music-note" size={16} color="rgba(255,255,255,0.55)" style={styles.leftIcon}/>
            <Text style={styles.selectorText} numberOfLines={1}>{currentOption.label}</Text>
            <MaterialCommunityIcons name="chevron-right" size={18} color="rgba(255,255,255,0.4)"/>
        </Pressable>
    );
}

const styles = StyleSheet.create({
    selectorPill: {
        flexDirection: 'row',
        alignItems: 'center',
        backgroundColor: 'rgba(255,255,255,0.024)',
        borderWidth: 1,
        borderColor: 'rgba(255,255,255,0.09)',
        borderRadius: 15,
        height: 46,
        paddingHorizontal: 18,
        flex: 1,
        maxWidth: 320,
        gap: 12,
    },
    leftIcon: {
        marginRight: 8,
    },
    selectorText: {
        flex: 1,
        fontFamily: 'Montserrat',
        fontSize: 15,
        color: 'rgba(255,255,255,0.8)',
    },
    modalList: {
        paddingTop: 8,
    },
    optionRow: {
        paddingVertical: 14,
        paddingHorizontal: 4,
        borderBottomWidth: 1,
        borderBottomColor: 'rgba(255,255,255,0.08)',
    },
    optionLabel: {
        fontFamily: 'Montserrat',
        fontSize: 16,
        color: '#29b6d8',
        marginBottom: 2,
    },
    optionDesc: {
        fontFamily: 'Montserrat',
        fontSize: 13,
        color: 'rgba(255,255,255,0.45)',
    },
});

export default TrackModalSelector;
