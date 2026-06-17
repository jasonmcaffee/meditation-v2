import React from "react";
import {Image, Pressable, View} from "react-native";
// @ts-ignore
import * as styles from "../style/common-components/media-thumbnail-row.scss";
import {getMediaUri, IMediaItem} from "../models/IMeditationSession";
import MaterialCommunityIcons from "react-native-vector-icons/MaterialCommunityIcons";

type Props = {
    media: IMediaItem[],
    onMediaClick?: (index: number)=> void,
    onRemoveClick?: (index: number)=> void, //when provided, each tile shows a remove (×) badge
    testIDPrefix?: string,
};

/**
 * Horizontal, wrapping row of square media tiles. Photos show a thumbnail; videos and audio
 * show an icon tile (with a play badge for video). Tapping a tile fires onMediaClick; when
 * onRemoveClick is supplied (edit mode) each tile shows a removable × badge.
 */
function MediaThumbnailRow({media, onMediaClick, onRemoveClick, testIDPrefix = 'session-media'}: Props){
    if(!media || media.length === 0){ return null; }
    return <View style={styles.thumbnailRow}>
        {media.map((item, index) => renderTile(item, index, onMediaClick, onRemoveClick, testIDPrefix))}
    </View>;
}

/**
 * Render a single media tile (photo image, or icon tile for video/audio) with an optional remove badge.
 * @param item - the media item to render
 * @param index - position in the row, used for testIDs and click callbacks
 */
function renderTile(item: IMediaItem, index: number, onMediaClick?: (i: number)=>void, onRemoveClick?: (i: number)=>void, testIDPrefix = 'session-media'){
    return <View key={`${item.fileName}-${index}`} style={styles.thumbnailWrapper}>
        <Pressable testID={`${testIDPrefix}-${index}`} onPress={() => onMediaClick && onMediaClick(index)}>
            {renderTileContent(item)}
        </Pressable>
        {onRemoveClick &&
            <Pressable testID={`${testIDPrefix}-remove-${index}`} style={styles.removeBadge} onPress={() => onRemoveClick(index)}>
                <MaterialCommunityIcons name="close" size={14} color="#ffffff"/>
            </Pressable>
        }
    </View>;
}

/**
 * Render the inner content of a tile based on media type: image for photos, icon tile for
 * audio, and an image-or-placeholder tile with a play badge for videos.
 * @param item - the media item whose visual representation is produced
 */
function renderTileContent(item: IMediaItem){
    if(item.type === 'photo'){
        return <Image source={{uri: getMediaUri(item)}} style={styles.thumbnail}/>;
    }
    if(item.type === 'audio'){
        return <View style={[styles.thumbnail, styles.iconTile]}>
            <MaterialCommunityIcons name="waveform" size={28} color="rgba(255,255,255,0.9)"/>
        </View>;
    }
    return <View style={[styles.thumbnail, styles.iconTile]}>
        <MaterialCommunityIcons name="play-circle-outline" size={30} color="rgba(255,255,255,0.95)"/>
    </View>;
}

export default MediaThumbnailRow;
