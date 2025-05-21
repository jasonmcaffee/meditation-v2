import React, {PropsWithChildren} from "react";
// @ts-ignore
import * as styles from "../style/common-components/modal.scss";
import Div from "../common-components/Div";
import {faClose} from "@fortawesome/free-solid-svg-icons/faClose";
import IconButton from "./IconButton";
import {StyleProp, useWindowDimensions, ViewStyle} from "react-native";

type Props = PropsWithChildren<{
    className?: StyleProp<ViewStyle>,
    onCloseClick?: ()=> void,
    windowClassName?: StyleProp<ViewStyle>,
    showCloseButton?: boolean,
}>;

function Modal({children, className = null, windowClassName = null, onCloseClick, showCloseButton = true}: Props){
    //the css approach doesn't work well, so we need to get the device's height and width programmatically.
    const screenHeight = useWindowDimensions().height;
    const screenWidth = useWindowDimensions().width;
    const sizeStyle = {height: screenHeight, width: screenWidth};
    const style = [styles.modal, sizeStyle, className];

    const closeButton = showCloseButton ? <IconButton icon={faClose} onClick={onCloseClick} className={styles.modalCloseButton} iconClassName={styles.modalCloseButtonIcon} size={35}/> : null;
    return <Div className={style} onClick={onCloseClick} >
        <Div className={[styles.modalWindow, windowClassName]}>
            {closeButton}
            {children}
        </Div>
    </Div>;
}

export default Modal;