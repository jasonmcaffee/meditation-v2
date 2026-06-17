import React, {useState} from "react";
import {Image, Modal, Pressable, View} from "react-native";
// @ts-ignore
import * as styles from "../style/common-components/media-viewer.scss";
import Video from "react-native-video";
import {getMediaUri, IMediaItem} from "../models/IMeditationSession";
import MaterialCommunityIcons from "react-native-vector-icons/MaterialCommunityIcons";

type Props = {
    media: IMediaItem[],
    startIndex?: number,
    onCloseClick: ()=> void,
};

/**
 * Full-screen media viewer rendered through a native Modal so it always presents above the whole
 * app (even from inside a FlatList row). Shows photos as images and videos/audio in a player with
 * native controls. For multiple items, left/right arrows step between them.
 */
function MediaViewer({media, startIndex = 0, onCloseClick}: Props){
    const [index, setIndex] = useState(startIndex);
    if(!media || media.length === 0){ return null; }

    const current = media[Math.max(0, Math.min(index, media.length - 1))];
    const hasMultiple = media.length > 1;

    return <Modal visible={true} transparent={true} animationType="fade" onRequestClose={onCloseClick} statusBarTranslucent={true}>
        <View testID="media-viewer" style={styles.overlay}>
            <Pressable testID="media-viewer-close" style={styles.closeButton} onPress={onCloseClick}>
                <MaterialCommunityIcons name="close" size={28} color="#ffffff"/>
            </Pressable>
            {renderMedia(current)}
            {hasMultiple && renderNav(index, media.length, setIndex)}
        </View>
    </Modal>;
}

/**
 * Render the current media item: an image for photos, or a video player (with a music icon
 * backdrop for audio) using native transport controls.
 * @param item - the media item currently in view
 */
function renderMedia(item: IMediaItem){
    if(item.type === 'photo'){
        return <Image testID="media-viewer-image" source={{uri: getMediaUri(item)}} style={styles.image} resizeMode="contain"/>;
    }
    const isAudio = item.type === 'audio';
    return <View testID={isAudio ? 'media-viewer-audio' : 'media-viewer-video'} style={styles.playerWrapper}>
        {isAudio &&
            <View style={styles.audioIcon} pointerEvents="none">
                <MaterialCommunityIcons name="waveform" size={96} color="rgba(255,255,255,0.85)"/>
            </View>
        }
        <Video
            source={{uri: getMediaUri(item)}}
            style={isAudio ? styles.audioPlayer : styles.video}
            controls={true}
            paused={false}
            resizeMode="contain"
            ignoreSilentSwitch="ignore"
        />
    </View>;
}

/**
 * Render the prev/next navigation controls for stepping through multiple media items.
 * @param index - current item index
 * @param count - total number of items
 * @param setIndex - state setter to change the visible item
 */
function renderNav(index: number, count: number, setIndex: (i: number)=>void){
    return <View style={styles.navRow} pointerEvents="box-none">
        <Pressable testID="media-viewer-prev" style={styles.navButton} onPress={() => setIndex(index <= 0 ? count - 1 : index - 1)}>
            <MaterialCommunityIcons name="chevron-left" size={36} color="#ffffff"/>
        </Pressable>
        <Pressable testID="media-viewer-next" style={styles.navButton} onPress={() => setIndex(index >= count - 1 ? 0 : index + 1)}>
            <MaterialCommunityIcons name="chevron-right" size={36} color="#ffffff"/>
        </Pressable>
    </View>;
}

export default MediaViewer;
