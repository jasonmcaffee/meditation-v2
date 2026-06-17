import React, {PropsWithChildren, ReactNode} from "react";
// @ts-ignore
import * as styles from "../style/common-components/modal.scss";
import Div from "../common-components/Div";
import {StyleProp, useWindowDimensions, ViewStyle} from "react-native";
import MaterialCommunityIcons from "react-native-vector-icons/MaterialCommunityIcons";
import appEventBus from "../services/appEventBus";

type Props = PropsWithChildren<{
    className?: StyleProp<ViewStyle>,
    onCloseClick?: ()=> void,
    windowClassName?: StyleProp<ViewStyle>,
    showCloseButton?: boolean,
}>;

/**
 * Dark glassmorphic modal overlay. Renders children inside a rounded dark panel with optional close button.
 */
function Modal({children, className = null, windowClassName = null, onCloseClick, showCloseButton = true}: Props){
    const screenHeight = useWindowDimensions().height;
    const screenWidth = useWindowDimensions().width;
    const sizeStyle = {height: screenHeight, width: screenWidth};
    const style = [styles.modal, sizeStyle, className];

    function handleClosePress() {
        appEventBus.hapticFeedback.light().set(true);
        onCloseClick && onCloseClick();
    }

    const closeButton = showCloseButton
        ? <Div className={styles.modalCloseButton} onClick={handleClosePress}>
            <MaterialCommunityIcons name="close" size={24} color="#ffffff"/>
          </Div>
        : null;

    return <Div className={style} onClick={onCloseClick} >
        <Div className={[styles.modalWindow, windowClassName]} onClick={() => {}}>
            {closeButton}
            {children}
        </Div>
    </Div>;
}

export default Modal;
