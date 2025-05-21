import React, {PropsWithChildren, useEffect, useState} from "react";
import {Text, TextInput} from 'react-native';
// @ts-ignore
import * as styles from "../../style/components/time-page/sound-settings-modal.scss";
import Div from "../../common-components/Div";
import Modal from "../../common-components/Modal";
import IconButton from "../../common-components/IconButton";
type Props = PropsWithChildren<{
    onCloseClick?: ()=> void,
    onSaveClick?: (notes: string, rating: number)=> void,
}>;
import {faSave} from "@fortawesome/free-solid-svg-icons/faSave";
import Button from "../../common-components/Button";

function SoundSettingsModal({children, onCloseClick, onSaveClick}: Props){
    return <Modal onCloseClick={onCloseClick} className={styles.soundSettingsModal} windowClassName={styles.soundSettingsModalWindow}>
        <Div className={styles.rowOne}>
            <Text style={styles.durationText}>Hello</Text>
        </Div>
    </Modal>
}

export default SoundSettingsModal;