import React, {PropsWithChildren} from "react";
import {Text} from 'react-native';
// @ts-ignore
import * as styles from "../../style/components/time-page/sound-settings-modal.scss";
import Div from "../../common-components/Div";
import Modal from "../../common-components/Modal";

type Props = PropsWithChildren<{
    onCloseClick?: ()=> void,
    onSaveClick?: (notes: string, rating: number)=> void,
}>;

/**
 * Dark glassmorphic modal for sound settings configuration.
 */
function SoundSettingsModal({children, onCloseClick, onSaveClick}: Props){
    return <Modal onCloseClick={onCloseClick} className={styles.soundSettingsModal} windowClassName={styles.soundSettingsModalWindow}>
        <Div className={styles.rowOne}>
            <Text style={styles.durationText}>Sound Settings</Text>
        </Div>
    </Modal>
}

export default SoundSettingsModal;
