import React, {PropsWithChildren, useEffect, useState} from "react";
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
// import StarRating from "react-native-star-rating-widget/lib/typescript";
//@ts-ignore
import StarRating from 'react-native-star-rating-widget';
/**
 * Todo:
 * - rate your session
 * -- perhaps several things: concentration, number of distractions, peacefulness, jhana levels.
 * @param meditationSession
 * @param children
 * @param className
 * @param onCloseClick
 * @constructor
 */
function FinishSessionModal({meditationSession, children, onCloseClick, onSaveClick}: Props) {
    const [notes, setNotes] = useState<string>(meditationSession.notes);
    const [rating, setRating] = useState(0);
    const [selectedIndex, setSelectedIndex] = useState(0);
    return <Modal onCloseClick={onCloseClick} className={styles.finishSessionModal} windowClassName={styles.finishSessionModalWindow}>
        <Div className={styles.rowOne}>
            <Text style={styles.durationText}>{ getFormattedDuration(meditationSession.durationMs)}</Text>
        </Div>
        <Div className={styles.rowTwo}>
            <Text style={styles.notesText}>Notes</Text>
            <TextInput style={styles.notesTextInput} value={notes} onChangeText={setNotes} multiline numberOfLines={4} placeholder={"Notes about your session"}/>
        </Div>
        <Div className={styles.rowThree}>
            <StarRating rating={rating} onChange={setRating} color={"rgba(37, 37, 37, .7)"} starSize={50} animationConfig={{scale: 1}}/>
        </Div>
        <Div className={styles.rowFour}>
            <Button onClick={() => onSaveClick && onSaveClick(notes, rating)} text={"Save"} style2={true}/>
        </Div>
    </Modal>
}

export default FinishSessionModal;