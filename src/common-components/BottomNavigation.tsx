import React, {PropsWithChildren, useEffect, useState} from 'react';
import {View, Text, Button, StyleProp, ViewStyle} from "react-native";
import Div from "./Div";
import { FontAwesomeIcon } from '@fortawesome/react-native-fontawesome';
//dharma wheel
import {faDharmachakra} from "@fortawesome/free-solid-svg-icons/faDharmachakra";
import {faOm} from "@fortawesome/free-solid-svg-icons/faOm";
import {faVihara} from "@fortawesome/free-solid-svg-icons/faVihara";

// @ts-ignore
import * as styles from '../style/common-components/bottom-navigation.scss';
import appEventBus from "../services/appEventBus";
import createUnregisterFunction from "../react-utils/createUnregisterFunction";

type Props = PropsWithChildren<{
    className?: StyleProp<ViewStyle>,
    onClick?: ()=> void,
}>;

function BottomNavigation({className}: Props){
    const [currentPage, setCurrentPage] = useState(appEventBus.navigation.goToPage().get());
    useEffect(() => {
        return createUnregisterFunction(appEventBus.navigation.goToPage().on(setCurrentPage));
    }, []);

    function onClickGoToPage(page: string){
        appEventBus.hapticFeedback.light().set(true);
        appEventBus.navigation.goToPage().set(page);
    }
    return (
        <Div className={[styles.bottomNavigation, className]}>
            <Div className={currentPage == "Timer" ? styles.navigationItemActive : styles.navigationItem}  onClick={()=> onClickGoToPage('Timer')}>
                <FontAwesomeIcon style={currentPage == "Timer" ? styles.navigationIconActive: styles.navigationIcon} icon={faOm} size={30}/>
            </Div>
            <Div className={currentPage == "Sessions" ? styles.navigationItemActive : styles.navigationItem} onClick={()=> onClickGoToPage('Sessions')}>
                <FontAwesomeIcon style={currentPage == "Sessions" ? styles.navigationIconActive : styles.navigationIcon} icon={faVihara} size={30}/>
            </Div>
        </Div>
    );
}
const MemoizedBottomNavigation = React.memo(BottomNavigation);
export default MemoizedBottomNavigation;