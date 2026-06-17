import React, {PropsWithChildren, useRef, useState} from "react";
import {Pressable, Text, TextInput, View} from 'react-native';
// @ts-ignore
import * as styles from "../../style/components/time-page/finish-session-modal.scss";
import Div from "../../common-components/Div";
import Modal from "../../common-components/Modal";
import IMeditationSession, {getFormattedDuration, IMediaItem} from "../../models/IMeditationSession";
//@ts-ignore
import StarRating from 'react-native-star-rating-widget';
import GradientButton from "../../common-components/GradientButton";
import GradientStar from "../../common-components/GradientStar";
import MaterialCommunityIcons from "react-native-vector-icons/MaterialCommunityIcons";
import MediaThumbnailRow from "../../common-components/MediaThumbnailRow";
import MediaViewer from "../../common-components/MediaViewer";
import MediaPickerModal from "./MediaPickerModal";
import mediaService from "../../services/mediaService";

type Props = PropsWithChildren<{
    onCloseClick?: ()=> void,
    onSaveClick?: (notes: string, rating: number, media: IMediaItem[])=> void,
    meditationSession: IMeditationSession,
}>;

/**
 * Dark glassmorphic modal for saving a finished session. Accepts notes, a star rating, and media
 * (photos, videos, audio added via the media picker). Media is copied into the app data dir as it
 * is attached; unsaved media is cleaned up if the modal is closed without saving.
 */
function FinishSessionModal({meditationSession, children, onCloseClick, onSaveClick}: Props) {
    const [rating, setRating] = useState(0);
    const notesRef = useRef<string>(meditationSession.notes);
    const [notes, setNotes] = useState<string>(meditationSession.notes);
    const [media, setMedia] = useState<IMediaItem[]>([]);
    const mediaRef = useRef<IMediaItem[]>([]);
    const savedRef = useRef<boolean>(false);
    const [showMediaPicker, setShowMediaPicker] = useState(false);
    const [viewerIndex, setViewerIndex] = useState<number | null>(null);

    function handleNotesChange(text: string) {
        notesRef.current = text;
        setNotes(text);
    }

    function setMediaState(next: IMediaItem[]) {
        mediaRef.current = next;
        setMedia(next);
    }

    function handleMediaAdded(item: IMediaItem) {
        setMediaState([...mediaRef.current, item]);
    }

    async function handleRemoveMedia(index: number) {
        const item = mediaRef.current[index];
        if (!item) { return; }
        await mediaService.deleteMedia([item]);
        setMediaState(mediaRef.current.filter((_, i) => i !== index));
    }

    function handleSave() {
        savedRef.current = true;
        onSaveClick && onSaveClick(notesRef.current, rating, mediaRef.current);
    }

    // Closing without saving must not leave orphaned copied files behind.
    async function handleClose() {
        if (!savedRef.current && mediaRef.current.length) {
            await mediaService.deleteMedia(mediaRef.current);
        }
        onCloseClick && onCloseClick();
    }

    const mediaPicker = showMediaPicker
        ? <MediaPickerModal onMediaAdded={handleMediaAdded} onCloseClick={() => setShowMediaPicker(false)}/>
        : null;
    const viewer = viewerIndex !== null
        ? <MediaViewer media={media} startIndex={viewerIndex} onCloseClick={() => setViewerIndex(null)}/>
        : null;

    return <Modal onCloseClick={handleClose} className={styles.finishSessionModal} windowClassName={styles.finishSessionModalWindow}>
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
            <Pressable testID="new-media-button" style={({pressed}) => [styles.newMediaButton, pressed && styles.newMediaButtonPressed]} onPress={() => setShowMediaPicker(true)}>
                <MaterialCommunityIcons name="plus" size={26} color="#ffffff"/>
            </Pressable>
        </Div>
        <MediaThumbnailRow
            media={media}
            onMediaClick={(i) => setViewerIndex(i)}
            onRemoveClick={handleRemoveMedia}
            testIDPrefix="finish-media"
        />
        <Div className={styles.rowThree}>
            <StarRating
                rating={rating}
                onChange={setRating}
                starSize={46}
                StarIconComponent={GradientStar}
                animationConfig={{scale: 1}}
            />
        </Div>
        <Div className={styles.rowFour}>
            <GradientButton testID="save-button" onClick={handleSave} text={"Save"}/>
        </Div>
        {mediaPicker}
        {viewer}
    </Modal>
}

export default FinishSessionModal;
