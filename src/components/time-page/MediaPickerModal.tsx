import React, {useEffect, useRef, useState} from "react";
import {Modal, Pressable, Text, View} from "react-native";
// @ts-ignore
import * as styles from "../../style/components/time-page/media-picker-modal.scss";
import MaterialCommunityIcons from "react-native-vector-icons/MaterialCommunityIcons";
import AudioRecorderPlayer from "react-native-audio-recorder-player";
import mediaService from "../../services/mediaService";
import {IMediaItem} from "../../models/IMeditationSession";

type Props = {
    onMediaAdded: (item: IMediaItem)=> void,
    onCloseClick: ()=> void,
};

type Mode = 'menu' | 'recording' | 'recorded';

/**
 * Full-screen sheet (native Modal) for attaching media to a session. Offers photo/video capture,
 * photo/video library pickers, and an in-place audio recorder. Each successful action hands the
 * resulting media item back via onMediaAdded and closes the sheet.
 */
function MediaPickerModal({onMediaAdded, onCloseClick}: Props){
    const [mode, setMode] = useState<Mode>('menu');
    const [elapsedMs, setElapsedMs] = useState(0);
    const recordedUriRef = useRef<string | null>(null);

    // Ensure any in-progress recording is torn down if the sheet unmounts unexpectedly.
    useEffect(() => () => { AudioRecorderPlayer.removeRecordBackListener(); }, []);

    async function runPicker(picker: ()=> Promise<IMediaItem | null>){
        const item = await picker();
        if(item){ onMediaAdded(item); }
        onCloseClick();
    }

    async function startRecording(){
        recordedUriRef.current = null;
        setElapsedMs(0);
        setMode('recording');
        await AudioRecorderPlayer.startRecorder();
        AudioRecorderPlayer.addRecordBackListener(e => setElapsedMs(e.currentPosition));
    }

    async function stopRecording(){
        recordedUriRef.current = await AudioRecorderPlayer.stopRecorder();
        AudioRecorderPlayer.removeRecordBackListener();
        setMode('recorded');
    }

    async function saveRecording(){
        if(!recordedUriRef.current){ return onCloseClick(); }
        const item = await mediaService.saveRecordedAudio(recordedUriRef.current);
        if(item){ onMediaAdded(item); }
        onCloseClick();
    }

    const body = mode === 'menu'
        ? renderMenu(runPicker, startRecording)
        : renderRecorder(mode, elapsedMs, stopRecording, saveRecording, startRecording);

    return <Modal visible={true} transparent={true} animationType="fade" onRequestClose={onCloseClick} statusBarTranslucent={true}>
        <View testID="media-picker-modal" style={styles.overlay}>
            <View style={styles.panel}>
                <View style={styles.header}>
                    <Text style={styles.title}>Add Media</Text>
                    <Pressable testID="media-picker-close" style={styles.closeButton} onPress={onCloseClick}>
                        <MaterialCommunityIcons name="close" size={24} color="#ffffff"/>
                    </Pressable>
                </View>
                {body}
            </View>
        </View>
    </Modal>;
}

/**
 * Render the action menu of capture / pick / record buttons.
 * @param runPicker - runs a media-service picker then closes the sheet
 * @param startRecording - switches the sheet into audio-recording mode
 */
function renderMenu(runPicker: (p: ()=> Promise<IMediaItem | null>)=> void, startRecording: ()=> void){
    return <View>
        {renderActionButton('take-photo', 'camera-outline', 'Take Photo', () => runPicker(mediaService.capturePhoto))}
        {renderActionButton('add-photo', 'image-multiple-outline', 'Add Photo', () => runPicker(mediaService.pickPhoto))}
        {renderActionButton('take-video', 'video-outline', 'Take Video', () => runPicker(mediaService.captureVideo))}
        {renderActionButton('add-video', 'video-box', 'Add Video', () => runPicker(mediaService.pickVideo))}
        {renderActionButton('record-audio', 'microphone-outline', 'Record Audio', startRecording)}
    </View>;
}

/**
 * Render a single pill action button with a tinted icon circle and label.
 * @param key - test id / react key for the action
 * @param icon - MaterialCommunityIcons glyph name
 * @param label - button text
 * @param onPress - press handler
 */
function renderActionButton(key: string, icon: string, label: string, onPress: ()=> void){
    return <Pressable key={key} testID={`media-${key}-button`} onPress={onPress} style={({pressed}) => [styles.actionButton, pressed && styles.actionButtonPressed]}>
        <View style={styles.actionIconCircle}>
            <MaterialCommunityIcons name={icon} size={22} color="#ffffff"/>
        </View>
        <Text style={styles.actionLabel}>{label}</Text>
    </Pressable>;
}

/**
 * Render the audio recording panel: a record/stop control, elapsed time, and (once stopped)
 * save / re-record actions.
 * @param mode - 'recording' while capturing, 'recorded' once stopped
 * @param elapsedMs - current elapsed recording time in milliseconds
 */
function renderRecorder(mode: Mode, elapsedMs: number, stopRecording: ()=> void, saveRecording: ()=> void, startRecording: ()=> void){
    const isRecording = mode === 'recording';
    return <View style={styles.recorder}>
        <Text style={styles.timer}>{AudioRecorderPlayer.mmss(Math.floor(elapsedMs / 1000))}</Text>
        {isRecording
            ? <Pressable testID="audio-stop-button" onPress={stopRecording} style={styles.recordButton}>
                <MaterialCommunityIcons name="stop" size={36} color="#ffffff"/>
              </Pressable>
            : <View style={styles.recordedActions}>
                <Pressable testID="audio-rerecord-button" onPress={startRecording} style={({pressed}) => [styles.secondaryButton, pressed && styles.actionButtonPressed]}>
                    <Text style={styles.secondaryLabel}>Re-record</Text>
                </Pressable>
                <Pressable testID="audio-save-button" onPress={saveRecording} style={({pressed}) => [styles.saveButton, pressed && styles.actionButtonPressed]}>
                    <Text style={styles.saveLabel}>Save</Text>
                </Pressable>
              </View>
        }
        <Text style={styles.recorderHint}>{isRecording ? 'Recording… tap to stop' : 'Recorded'}</Text>
    </View>;
}

export default MediaPickerModal;
