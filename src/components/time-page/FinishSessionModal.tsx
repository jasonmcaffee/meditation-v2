import React, {PropsWithChildren, useEffect, useRef, useState} from "react";
import {InteractionManager, Pressable, Text, TextInput} from 'react-native';
// @ts-ignore
import * as styles from "../../style/components/time-page/finish-session-modal.scss";
import Div from "../../common-components/Div";
import Modal from "../../common-components/Modal";
import useKeyboardHeight from "../../hooks/useKeyboardHeight";
import IMeditationSession, {getFormattedDuration, IMediaItem} from "../../models/IMeditationSession";
//@ts-ignore
import StarRating from 'react-native-star-rating-widget';
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
    const keyboardHeight = useKeyboardHeight();
    const [rating, setRating] = useState(0);
    const notesRef = useRef<string>(meditationSession.notes);
    const notesInputRef = useRef<TextInput>(null);
    const [notes, setNotes] = useState<string>(meditationSession.notes);
    const [media, setMedia] = useState<IMediaItem[]>([]);
    const mediaRef = useRef<IMediaItem[]>([]);
    const savedRef = useRef<boolean>(false);
    const [showMediaPicker, setShowMediaPicker] = useState(false);
    const [viewerIndex, setViewerIndex] = useState<number | null>(null);

    // autoFocus is unreliable on physical iOS devices for an input in a freshly-mounted modal, so
    // focus explicitly once the open interaction settles — this reliably raises the keyboard.
    useEffect(() => {
        const task = InteractionManager.runAfterInteractions(() => notesInputRef.current?.focus());
        return () => task.cancel();
    }, []);

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

    // Shrink the window so its bottom edge (and the Save button) rests just above the keyboard.
    const windowStyle = [styles.finishSessionModalWindow, keyboardHeight > 0 ? {marginBottom: keyboardHeight} : null];

    return <Modal onCloseClick={handleClose} className={styles.finishSessionModal} windowClassName={windowStyle}>
        <Div className={styles.rowOne}>
            <Text style={styles.durationText} testID="session-duration">{ getFormattedDuration(meditationSession.durationMs)}</Text>
        </Div>
        <Div className={styles.rowTwo}>
            <Text style={styles.notesText}>Notes</Text>
            <TextInput
                ref={notesInputRef}
                testID="notes-input"
                style={styles.notesTextInput}
                value={notes}
                onChangeText={handleNotesChange}
                multiline
                placeholder={"Notes about your session"}
                placeholderTextColor={"rgba(255,255,255,0.3)"}
            />
            <Pressable testID="new-media-button" style={({pressed}) => [styles.newMediaButton, pressed && styles.newMediaButtonPressed]} onPress={() => setShowMediaPicker(true)}>
                <MaterialCommunityIcons name="paperclip" size={22} color="rgba(255,255,255,0.92)"/>
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
            <Pressable testID="save-button" onPress={handleSave} style={({pressed}) => [styles.saveButton, pressed && styles.saveButtonPressed]}>
                <Text style={styles.saveButtonText}>Save</Text>
            </Pressable>
        </Div>
        {mediaPicker}
        {viewer}
    </Modal>
}

export default FinishSessionModal;
