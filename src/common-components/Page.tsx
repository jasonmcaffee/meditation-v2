import React, {PropsWithChildren, ReactNode, useEffect, useRef, useState} from "react";
import {SafeAreaView, Animated, StyleSheet} from "react-native";
import BottomNavigation from "./BottomNavigation";
import appEventBus from "../services/appEventBus";
import createUnregisterFunction from "../react-utils/createUnregisterFunction";

type Props = PropsWithChildren<{
    pageName: string;
    modal?: ReactNode;
}>;

/**
 * Page wrapper with fade animation and in-flow bottom navigation bar.
 */
function Page({pageName, children, modal}: Props) {
    const [currentPageName, setCurrentPageName] = useState(appEventBus.navigation.goToPage().get());
    const fadeAnim = useRef(new Animated.Value(0)).current;
    const isVisible = currentPageName === pageName;

    useEffect(() => {
        if (isVisible) {
            Animated.timing(fadeAnim, {useNativeDriver: true, toValue: 1, duration: 400}).start();
        }
        return createUnregisterFunction(appEventBus.navigation.goToPage().on(newPage => {
            setCurrentPageName(newPage);
            Animated.timing(fadeAnim, {
                useNativeDriver: true,
                toValue: newPage === pageName ? 1 : 0,
                duration: newPage === pageName ? 400 : 0,
            }).start();
        }));
    }, [fadeAnim]);

    return (
        <SafeAreaView style={[styles.page, !isVisible && styles.hidden]}>
            {modal}
            <Animated.View style={[styles.content, {opacity: fadeAnim}]}>
                {children}
            </Animated.View>
            <BottomNavigation/>
        </SafeAreaView>
    );
}

const styles = StyleSheet.create({
    page: {
        position: 'absolute',
        zIndex: 1,
        height: '100%',
        width: '100%',
        backgroundColor: '#0d0e16',
    },
    hidden: {
        display: 'none',
    },
    content: {
        flex: 1,
    },
});

export default Page;
