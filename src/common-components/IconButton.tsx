import React, {PropsWithChildren} from "react";
// @ts-ignore
import * as styles from "../style/common-components/icon-button.scss";
import Div from "./Div";
import {faOm} from "@fortawesome/free-solid-svg-icons/faOm";
import {FontAwesomeIcon} from "@fortawesome/react-native-fontawesome";
import {IconDefinition} from "@fortawesome/free-solid-svg-icons";
import {StyleProp, ViewStyle} from "react-native";
import appEventBus from "../services/appEventBus";

type Props = PropsWithChildren<{
    className?: StyleProp<ViewStyle>,
    iconClassName?: StyleProp<ViewStyle>,
    onClick?: ()=> void,
    icon?: IconDefinition,
    size?: number
}>;

function Button({children, className = null, iconClassName = null, onClick, icon=faOm, size=20}: Props){
    const style = [styles.iconButton, className];
    const iconStyle = [styles.icon, iconClassName];
    function hapticOnClick(){
        appEventBus.hapticFeedback.heavy().set(true);
        onClick && onClick();
    }
    return <Div className={style} onClick={hapticOnClick}>
        {children}
        <FontAwesomeIcon style={iconStyle} icon={icon} size={size}/>
    </Div>;
}

export default Button;