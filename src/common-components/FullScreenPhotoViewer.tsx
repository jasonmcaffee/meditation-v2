import React, {useState} from "react";
import {Image, Modal, Pressable, View} from "react-native";
// @ts-ignore
import * as styles from "../style/common-components/full-screen-photo-viewer.scss";
import {getPhotoUri} from "../models/IMeditationSession";
import MaterialCommunityIcons from "react-native-vector-icons/MaterialCommunityIcons";

type Props = {
    photos: string[], //file names
    startIndex?: number,
    onCloseClick: ()=> void,
};

/**
 * Full-screen photo viewer. Rendered through a native Modal so it always presents above the
 * whole app regardless of where it is mounted (e.g. inside a FlatList row). Shows one photo at
 * a time with a close button and, for multiple photos, left/right arrows to step between them.
 */
function FullScreenPhotoViewer({photos, startIndex = 0, onCloseClick}: Props){
    const [index, setIndex] = useState(startIndex);
    if(!photos || photos.length === 0){ return null; }

    const current = photos[Math.max(0, Math.min(index, photos.length - 1))];
    const hasMultiple = photos.length > 1;

    return <Modal visible={true} transparent={true} animationType="fade" onRequestClose={onCloseClick} statusBarTranslucent={true}>
        <View testID="fullscreen-photo-viewer" style={styles.overlay}>
            <Pressable testID="fullscreen-photo-close" style={styles.closeButton} onPress={onCloseClick}>
                <MaterialCommunityIcons name="close" size={28} color="#ffffff"/>
            </Pressable>
            <Image source={{uri: getPhotoUri(current)}} style={styles.image} resizeMode="contain"/>
            {hasMultiple && renderNav(index, photos.length, setIndex)}
        </View>
    </Modal>;
}

/**
 * Render the prev/next navigation controls for stepping through multiple photos.
 * @param index - current photo index
 * @param count - total number of photos
 * @param setIndex - state setter to change the visible photo
 */
function renderNav(index: number, count: number, setIndex: (i: number)=>void){
    return <View style={styles.navRow}>
        <Pressable testID="fullscreen-photo-prev" style={styles.navButton} onPress={() => setIndex(index <= 0 ? count - 1 : index - 1)}>
            <MaterialCommunityIcons name="chevron-left" size={36} color="#ffffff"/>
        </Pressable>
        <Pressable testID="fullscreen-photo-next" style={styles.navButton} onPress={() => setIndex(index >= count - 1 ? 0 : index + 1)}>
            <MaterialCommunityIcons name="chevron-right" size={36} color="#ffffff"/>
        </Pressable>
    </View>;
}

export default FullScreenPhotoViewer;
