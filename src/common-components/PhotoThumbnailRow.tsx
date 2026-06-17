import React from "react";
import {Image, Pressable, View} from "react-native";
// @ts-ignore
import * as styles from "../style/common-components/photo-thumbnail-row.scss";
import {getPhotoUri} from "../models/IMeditationSession";
import MaterialCommunityIcons from "react-native-vector-icons/MaterialCommunityIcons";

type Props = {
    photos: string[], //file names
    onThumbnailClick?: (index: number)=> void,
    onRemoveClick?: (fileName: string)=> void, //when provided, each thumbnail shows a remove (×) badge
    testIDPrefix?: string,
};

/**
 * Horizontal row of square photo thumbnails. Tapping a thumbnail fires onThumbnailClick;
 * when onRemoveClick is supplied (edit mode) each thumbnail shows a removable × badge.
 */
function PhotoThumbnailRow({photos, onThumbnailClick, onRemoveClick, testIDPrefix = 'session-thumbnail'}: Props){
    if(!photos || photos.length === 0){ return null; }
    return <View style={styles.thumbnailRow}>
        {photos.map((fileName, index) => renderThumbnail(fileName, index, onThumbnailClick, onRemoveClick, testIDPrefix))}
    </View>;
}

/**
 * Render a single thumbnail with optional remove badge.
 * @param fileName - stored photo file name
 * @param index - position in the row, used for testIDs and click callbacks
 */
function renderThumbnail(fileName: string, index: number, onThumbnailClick?: (i: number)=>void, onRemoveClick?: (f: string)=>void, testIDPrefix = 'session-thumbnail'){
    return <View key={fileName} style={styles.thumbnailWrapper}>
        <Pressable testID={`${testIDPrefix}-${index}`} onPress={() => onThumbnailClick && onThumbnailClick(index)}>
            <Image source={{uri: getPhotoUri(fileName)}} style={styles.thumbnail}/>
        </Pressable>
        {onRemoveClick &&
            <Pressable testID={`${testIDPrefix}-remove-${index}`} style={styles.removeBadge} onPress={() => onRemoveClick(fileName)}>
                <MaterialCommunityIcons name="close" size={14} color="#ffffff"/>
            </Pressable>
        }
    </View>;
}

export default PhotoThumbnailRow;
