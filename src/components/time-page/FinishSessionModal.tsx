import React, {PropsWithChildren, useRef, useState} from "react";
import {Text, TextInput} from 'react-native';
// @ts-ignore
import * as styles from "../../style/components/time-page/finish-session-modal.scss";
import Div from "../../common-components/Div";
import Modal from "../../common-components/Modal";
import IMeditationSession, {getFormattedDuration} from "../../models/IMeditationSession";
import IconButton from "../../common-components/IconButton";
type Props = PropsWithChildren<{
    onCloseClick?: ()=> void,
    onSaveClick?: (notes: string, rating: number)=> void,
    meditationSession: IMeditationSession,
}>;
import {faSave} from "@fortawesome/free-solid-svg-icons/faSave";
import Button from "../../common-components/Button";
//@ts-ignore
import StarRating from 'react-native-star-rating-widget';

/**
 * Modal shown after finishing a meditation session. Lets the user add notes and a rating before saving.
 */
function FinishSessionModal({meditationSession, children, onCloseClick, onSaveClick}: Props) {
    const [rating, setRating] = useState(0);
    // Use a ref for notes so the Save button always reads the latest typed value,
    // even if the controlled TextInput re-render hasn't flushed yet on Android.
    const notesRef = useRef<string>(meditationSession.notes);
    const [notes, setNotes] = useState<string>(meditationSession.notes);

    function handleNotesChange(text: string) {
        notesRef.current = text;
        setNotes(text);
    }

    function handleSave() {
        onSaveClick && onSaveClick(notesRef.current, rating);
    }

    return <Modal onCloseClick={onCloseClick} className={styles.finishSessionModal} windowClassName={styles.finishSessionModalWindow}>
        <Div className={styles.rowOne}>
            <Text style={styles.durationText} testID="session-duration">{ getFormattedDuration(meditationSession.durationMs)}</Text>
        </Div>
        <Div className={styles.rowTwo}>
            <Text style={styles.notesText}>Notes</Text>
            <TextInput
                testID="notes-input"
                style={styles.notesTextInput}
                value={notes}
                onChangeText={handleNotesChange}
                multiline
                numberOfLines={4}
                placeholder={"Notes about your session"}
            />
        </Div>
        <Div className={styles.rowThree}>
            <StarRating rating={rating} onChange={setRating} color={"rgba(37, 37, 37, .7)"} starSize={50} animationConfig={{scale: 1}}/>
        </Div>
        <Div className={styles.rowFour}>
            <Button testID="save-button" onClick={handleSave} text={"Save"} style2={true}/>
        </Div>
    </Modal>
}

export default FinishSessionModal;
