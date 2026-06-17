import React, {useEffect, useState} from 'react';
import {Pressable, StyleSheet, Text, View} from 'react-native';
import appEventBus from "../services/appEventBus";
import createUnregisterFunction from "../react-utils/createUnregisterFunction";
import MaterialIcons from "react-native-vector-icons/MaterialIcons";

const TIMER_TAB    = 'Timer';
const SESSIONS_TAB = 'Sessions';

/**
 * Bottom navigation bar matching the design exactly:
 * border-top, space-around icons, padding 14/64/24.
 * No floating pill — plain bar at the bottom.
 */
function BottomNavigation() {
    const [currentPage, setCurrentPage] = useState(appEventBus.navigation.goToPage().get());

    useEffect(() => {
        return createUnregisterFunction(appEventBus.navigation.goToPage().on(setCurrentPage));
    }, []);

    function goTo(page: string) {
        appEventBus.hapticFeedback.light().set(true);
        appEventBus.navigation.goToPage().set(page);
    }

    const timerActive    = currentPage === TIMER_TAB;
    const sessionsActive = currentPage === SESSIONS_TAB;
    const activeColor    = 'rgba(255,255,255,0.90)';
    const inactiveColor  = 'rgba(255,255,255,0.35)';

    return (
        <View style={styles.bar}>
            <Pressable testID="timer-tab" onPress={() => goTo(TIMER_TAB)} style={styles.tab}>
                <Text style={[styles.omText, {color: timerActive ? activeColor : inactiveColor}]}>ॐ</Text>
            </Pressable>
            <Pressable testID="sessions-tab" onPress={() => goTo(SESSIONS_TAB)} style={styles.tab}>
                <MaterialIcons
                    name="temple-buddhist"
                    size={24}
                    color={sessionsActive ? activeColor : inactiveColor}
                />
            </Pressable>
        </View>
    );
}

const styles = StyleSheet.create({
    bar: {
        flexDirection: 'row',
        justifyContent: 'space-around',
        alignItems: 'center',
        paddingTop: 14,
        paddingBottom: 24,
        paddingHorizontal: 64,
        borderTopWidth: 1,
        borderTopColor: 'rgba(255,255,255,0.06)',
        marginTop: 14,
    },
    tab: {
        alignItems: 'center',
        justifyContent: 'center',
        padding: 8,
    },
    omText: {
        fontSize: 24,
        lineHeight: 28,
    },
});

const MemoizedBottomNavigation = React.memo(BottomNavigation);
export default MemoizedBottomNavigation;
