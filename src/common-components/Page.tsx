import React, {PropsWithChildren, ReactNode, useEffect, useRef, useState} from "react";
import StaticSafeAreaInsets from 'react-native-static-safe-area-insets';
// @ts-ignore
import * as styles from "../style/common-components/page.scss";
import Div from "./Div";
import {SafeAreaView, ScrollView, Text, Animated, StyleProp, ViewStyle} from "react-native";
import BottomNavigation from "./BottomNavigation";
import appEventBus from "../services/appEventBus";
import createUnregisterFunction from "../react-utils/createUnregisterFunction";

type Props = PropsWithChildren<{
    pageName: string,
    className?: StyleProp<ViewStyle>,
    modal?: ReactNode
}>;

function Page({pageName, children, className = null, modal}: Props){
    const bottom = StaticSafeAreaInsets?.safeAreaInsetsBottom ?? 10;
    const bottomPosition = {bottom};
    const bottomStyle = {...styles.bottomNavigation, ...bottomPosition};
    const [currentPageName, setCurrentPageName] = useState(appEventBus.navigation.goToPage().get());
    const style = currentPageName == pageName ? {} : {display: 'none'};
    const fadeAnim = useRef(new Animated.Value(0)).current;
    const pageStyle = {...styles.page, ...style};
    const pageContentStyle = {...styles.pageContent, opacity: fadeAnim};
    const animationDuration = 500;

    useEffect(()=>{
        if(currentPageName == pageName){ //needed so that the animation actually fires the first time you go to the page.
            Animated.timing(fadeAnim, {useNativeDriver: true, toValue: 1, duration: animationDuration}).start();
        }
        //animate fading the page into view.
        return createUnregisterFunction(appEventBus.navigation.goToPage().on(newPageName => {
            setCurrentPageName(newPageName);
            // console.log(`starting animation this page: ${pageName} currentPageName ${newPageName} `, fadeAnim);
            const toValue = newPageName == pageName ? 1 : 0;
            const duration = newPageName == pageName ? animationDuration : 0;
            Animated.timing(fadeAnim, {useNativeDriver: true, toValue, duration}).start();
        }));

    }, [fadeAnim]);

    return <SafeAreaView style={pageStyle}>
        {modal}
        <Animated.View style={pageContentStyle}>
            {children}
        </Animated.View>
        <Div className={styles.bottomNavigationSpace}/>
        <BottomNavigation className={bottomStyle}/>
    </SafeAreaView>
}

export default Page;