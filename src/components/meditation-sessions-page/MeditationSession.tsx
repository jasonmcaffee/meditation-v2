import React, {PropsWithChildren, useState} from "react";
//@ts-ignore
import StarRating from 'react-native-star-rating-widget';
// @ts-ignore
import * as styles from "../../style/components/meditation-page/meditation-session.scss";
import Div from "../../common-components/Div";
import IMeditationSession, {getFormattedDate, getFormattedDuration} from "../../models/IMeditationSession";
import {Text, View} from "react-native";
import ReanimatedSwipeable from "react-native-gesture-handler/ReanimatedSwipeable";
import MaterialCommunityIcons from "react-native-vector-icons/MaterialCommunityIcons";
import GradientStar from "../../common-components/GradientStar";
import PhotoThumbnailRow from "../../common-components/PhotoThumbnailRow";
import FullScreenPhotoViewer from "../../common-components/FullScreenPhotoViewer";

type Props = PropsWithChildren<{
    onDeleteClick: (i: IMeditationSession) => void,
    meditationSession: IMeditationSession,
}>;

/**
 * Glass card for a single meditation session. Shows date, duration, rating, notes and photo
 * thumbnails. Supports swipe-to-delete and opens a full-screen viewer when a thumbnail is tapped.
 * Uses ReanimatedSwipeable (not the legacy Swipeable) because the app runs on the New Architecture,
 * where the legacy gesture does not activate reliably.
 */
function MeditationSession({children, onDeleteClick, meditationSession}: Props){
    const [viewerIndex, setViewerIndex] = useState<number | null>(null);
    const photos = meditationSession.photos ?? [];

    return <ReanimatedSwipeable renderRightActions={() => renderRightActions(meditationSession.id, () => onDeleteClick(meditationSession))}>
        <Div key={meditationSession.id} testID={`session-item-${meditationSession.id}`} className={styles.meditationSession}>
            <Div className={styles.rowOne}>
                <Text style={styles.date}>{getFormattedDate(meditationSession.dateMs)}</Text>
                <Text style={styles.duration}>{getFormattedDuration(meditationSession.durationMs)}</Text>
            </Div>
            <Div className={styles.rowTwo}>
                {/* pointerEvents none lets horizontal swipes fall through to Swipeable; StarRating's
                    PanResponder otherwise captures the touch and blocks swipe-to-delete. Rating is read-only here. */}
                <View pointerEvents="none">
                    <StarRating
                        rating={meditationSession.rating}
                        starSize={18}
                        StarIconComponent={GradientStar}
                        onChange={() => null}
                        animationConfig={{scale: 1}}
                    />
                </View>
            </Div>
            {meditationSession.notes &&
            <Div className={styles.rowThree}>
                <Text style={styles.notes}>{meditationSession.notes}</Text>
            </Div>
            }
            {photos.length > 0 &&
            <PhotoThumbnailRow photos={photos} onThumbnailClick={(i) => setViewerIndex(i)}/>
            }
        </Div>
        {viewerIndex !== null &&
            <FullScreenPhotoViewer photos={photos} startIndex={viewerIndex} onCloseClick={() => setViewerIndex(null)}/>
        }
    </ReanimatedSwipeable>;
}

/**
 * Render the red delete action revealed when the card is swiped left.
 * @param sessionId - id of the session, used to build a stable testID for the delete button
 * @param onDeleteClick - invoked when the trash button is tapped
 */
function renderRightActions(sessionId: string, onDeleteClick: ()=>void){
    return (
        <Div className={styles.rightSwipeContainer}>
            <View style={[styles.animatedTextDeleteButtonContainer]}>
                <Div testID={`delete-button-${sessionId}`} className={styles.deleteButton} onClick={onDeleteClick}>
                    <MaterialCommunityIcons name="trash-can-outline" size={28} color="#ffffff"/>
                </Div>
            </View>
        </Div>
    );
}

export default MeditationSession;
