import React, {PropsWithChildren, useRef, useState} from "react";
import {Text, TextInput} from 'react-native';
// @ts-ignore
import * as styles from "../../style/components/time-page/finish-session-modal.scss";
import Div from "../../common-components/Div";
import Modal from "../../common-components/Modal";
import IMeditationSession, {getFormattedDuration} from "../../models/IMeditationSession";
//@ts-ignore
import StarRating from 'react-native-star-rating-widget';
import Button from "../../common-components/Button";

type Props = PropsWithChildren<{
    onCloseClick?: ()=> void,
    onSaveClick?: (notes: string, rating: number)=> void,
    meditationSession: IMeditationSession,
}>;

/**
 * Dark glassmorphic modal for saving a finished session. Accepts notes and a star rating.
 */
function FinishSessionModal({meditationSession, children, onCloseClick, onSaveClick}: Props) {
    const [rating, setRating] = useState(0);
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
                placeholderTextColor={"rgba(255,255,255,0.3)"}
            />
        </Div>
        <Div className={styles.rowThree}>
            <StarRating
                rating={rating}
                onChange={setRating}
                color={"#d64c8c"}
                emptyColor={"rgba(255,255,255,0.2)"}
                starSize={45}
                animationConfig={{scale: 1}}
            />
        </Div>
        <Div className={styles.rowFour}>
            <Button testID="save-button" onClick={handleSave} text={"Save"} style2={true}/>
        </Div>
    </Modal>
}

export default FinishSessionModal;
