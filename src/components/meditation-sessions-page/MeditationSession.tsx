import React, {PropsWithChildren} from "react";
//@ts-ignore
import StarRating from 'react-native-star-rating-widget';
// @ts-ignore
import * as styles from "../../style/components/meditation-page/meditation-session.scss";
import Div from "../../common-components/Div";
import IMeditationSession, {getFormattedDate, getFormattedDuration} from "../../models/IMeditationSession";
import {Animated, Text} from "react-native";
import {RectButton, Swipeable} from "react-native-gesture-handler";
import MaterialCommunityIcons from "react-native-vector-icons/MaterialCommunityIcons";
import AnimatedInterpolation = Animated.AnimatedInterpolation;

type Props = PropsWithChildren<{
    onDeleteClick: (i: IMeditationSession) => void,
    meditationSession: IMeditationSession,
}>;

/**
 * Glass card for a single meditation session. Supports swipe-to-delete revealing a red trash action.
 */
function MeditationSession({children, onDeleteClick, meditationSession}: Props){
    return <Swipeable renderRightActions={(progress, dragX) => renderRightActions(progress, dragX, () => onDeleteClick(meditationSession))}>
        <Div key={meditationSession.id} testID={`session-item-${meditationSession.id}`} className={styles.meditationSession}>
            <Div className={styles.rowOne}>
                <Text style={styles.date}>{getFormattedDate(meditationSession.dateMs)}</Text>
                <Text style={styles.duration}>{getFormattedDuration(meditationSession.durationMs)}</Text>
            </Div>
            <Div className={styles.rowTwo}>
                <StarRating
                    rating={meditationSession.rating}
                    color="#d64c8c"
                    emptyColor="rgba(255,255,255,0.15)"
                    starSize={18}
                    onChange={() => null}
                    animationConfig={{scale: 1}}
                />
            </Div>
            {meditationSession.notes &&
            <Div className={styles.rowThree}>
                <Text style={styles.notes}>{meditationSession.notes}</Text>
            </Div>
            }
        </Div>
    </Swipeable>;
}

function renderRightActions(progress: AnimatedInterpolation<any>, dragX: AnimatedInterpolation<any>, onDeleteClick: ()=>void){
    return (
        <Div className={styles.rightSwipeContainer}>
            <Animated.View style={[styles.animatedTextDeleteButtonContainer]}>
                <Div className={styles.deleteButton} onClick={onDeleteClick}>
                    <MaterialCommunityIcons name="trash-can-outline" size={28} color="#ffffff"/>
                </Div>
            </Animated.View>
        </Div>
    );
}

export default MeditationSession;
