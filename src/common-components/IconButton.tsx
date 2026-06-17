import React, {PropsWithChildren} from "react";
// @ts-ignore
import * as styles from "../style/common-components/icon-button.scss";
import Div from "./Div";
import {StyleProp, ViewStyle} from "react-native";
import appEventBus from "../services/appEventBus";
import MaterialCommunityIcons from "react-native-vector-icons/MaterialCommunityIcons";

type Props = PropsWithChildren<{
    className?: StyleProp<ViewStyle>,
    iconClassName?: StyleProp<ViewStyle>,
    onClick?: ()=> void,
    name?: string,
    size?: number,
    color?: string,
    testID?: string,
}>;

/**
 * An icon button using MaterialCommunityIcons. Fires haptic feedback on press.
 * @param name - MaterialCommunityIcons icon name (e.g. "bell-outline")
 * @param size - icon size in px
 * @param color - override icon color (defaults to style token)
 */
function IconButton({children, className = null, iconClassName = null, onClick, name = 'circle', size = 22, color, testID}: Props){
    const containerStyle = [styles.iconButton, className];
    const iconColor = color ?? (iconClassName as any)?.color ?? '#ffffff';

    function hapticOnClick(){
        appEventBus.hapticFeedback.heavy().set(true);
        onClick && onClick();
    }

    return <Div className={containerStyle} onClick={hapticOnClick} testID={testID}>
        {children}
        <MaterialCommunityIcons name={name} size={size} color={iconColor}/>
    </Div>;
}

export default IconButton;
