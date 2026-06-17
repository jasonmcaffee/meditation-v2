import React, {PropsWithChildren, useRef, useState} from "react";
import {Pressable, Text, TextInput} from 'react-native';
// @ts-ignore
import * as styles from "../../style/components/time-page/finish-session-modal.scss";
import Div from "../../common-components/Div";
import Modal from "../../common-components/Modal";
import IMeditationSession, {getFormattedDuration} from "../../models/IMeditationSession";
//@ts-ignore
import StarRating from 'react-native-star-rating-widget';
import GradientButton from "../../common-components/GradientButton";
import GradientStar from "../../common-components/GradientStar";
import MaterialCommunityIcons from "react-native-vector-icons/MaterialCommunityIcons";
import PhotoThumbnailRow from "../../common-components/PhotoThumbnailRow";
import FullScreenPhotoViewer from "../../common-components/FullScreenPhotoViewer";
import photoService from "../../services/photoService";

type Props = PropsWithChildren<{
    onCloseClick?: ()=> void,
    onSaveClick?: (notes: string, rating: number, photos: string[])=> void,
    meditationSession: IMeditationSession,
}>;

/**
 * Dark glassmorphic modal for saving a finished session. Accepts notes, a star rating,
 * and photos (captured via camera or attached from the gallery). Photos are copied into
 * the app data dir on attach; unsaved photos are cleaned up if the modal is closed.
 */
function FinishSessionModal({meditationSession, children, onCloseClick, onSaveClick}: Props) {
    const [rating, setRating] = useState(0);
    const notesRef = useRef<string>(meditationSession.notes);
    const [notes, setNotes] = useState<string>(meditationSession.notes);
    const [photos, setPhotos] = useState<string[]>([]);
    const photosRef = useRef<string[]>([]);
    const savedRef = useRef<boolean>(false);
    const [viewerIndex, setViewerIndex] = useState<number | null>(null);

    function handleNotesChange(text: string) {
        notesRef.current = text;
        setNotes(text);
    }

    function setPhotosState(next: string[]) {
        photosRef.current = next;
        setPhotos(next);
    }

    async function handleCapturePhoto() {
        const fileName = await photoService.capturePhoto();
        if (fileName) { setPhotosState([...photosRef.current, fileName]); }
    }

    async function handlePickPhoto() {
        const fileName = await photoService.pickPhoto();
        if (fileName) { setPhotosState([...photosRef.current, fileName]); }
    }

    async function handleRemovePhoto(fileName: string) {
        await photoService.deletePhotos([fileName]);
        setPhotosState(photosRef.current.filter(p => p !== fileName));
    }

    function handleSave() {
        savedRef.current = true;
        onSaveClick && onSaveClick(notesRef.current, rating, photosRef.current);
    }

    // Closing without saving must not leave orphaned copied files behind.
    async function handleClose() {
        if (!savedRef.current && photosRef.current.length) {
            await photoService.deletePhotos(photosRef.current);
        }
        onCloseClick && onCloseClick();
    }

    const viewer = viewerIndex !== null
        ? <FullScreenPhotoViewer photos={photos} startIndex={viewerIndex} onCloseClick={() => setViewerIndex(null)}/>
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
        </Div>
        <Div className={styles.photoRow}>
            <Pressable testID="capture-photo-button" style={({pressed}) => [styles.photoButton, pressed && styles.photoButtonPressed]} onPress={handleCapturePhoto}>
                <Div className={styles.photoButtonIconCircle}>
                    <MaterialCommunityIcons name="camera-outline" size={22} color="#ffffff"/>
                </Div>
                <Text style={styles.photoButtonLabel}>Take Photo</Text>
            </Pressable>
            <Pressable testID="pick-photo-button" style={({pressed}) => [styles.photoButton, pressed && styles.photoButtonPressed]} onPress={handlePickPhoto}>
                <Div className={styles.photoButtonIconCircle}>
                    <MaterialCommunityIcons name="image-multiple-outline" size={22} color="#ffffff"/>
                </Div>
                <Text style={styles.photoButtonLabel}>Add Photo</Text>
            </Pressable>
        </Div>
        <PhotoThumbnailRow
            photos={photos}
            onThumbnailClick={(i) => setViewerIndex(i)}
            onRemoveClick={handleRemovePhoto}
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
        {viewer}
    </Modal>
}

export default FinishSessionModal;
