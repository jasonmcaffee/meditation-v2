import React, {Component, PropsWithChildren} from "react";
//@ts-ignore
import StarRating from 'react-native-star-rating-widget';
// @ts-ignore
import * as styles from "../../style/components/meditation-page/meditation-session.scss";
import Div from "../../common-components/Div";
import IMeditationSession, {getFormattedDate, getFormattedDuration} from "../../models/IMeditationSession";
import {Animated, Text} from "react-native";
import IconButton from "../../common-components/IconButton";
import {faTrash} from "@fortawesome/free-solid-svg-icons/faTrash";
import {RectButton, Swipeable} from "react-native-gesture-handler";
import AnimatedInterpolation = Animated.AnimatedInterpolation;

type Props = PropsWithChildren<{
    onDeleteClick: (i: IMeditationSession) => void,
    meditationSession: IMeditationSession,
}>;

function MeditationSession({children, onDeleteClick, meditationSession}: Props){
    // const starColor = "rgb(37,37,37)";
    const starColor = "rgb(174, 174, 174 )";
    const emptyColor = "rgb(174, 174, 174 )";

    return <Swipeable renderRightActions={(progress, dragX) => renderRightActions(progress, dragX, ()=>{onDeleteClick(meditationSession)})}>
        <Div key={meditationSession.id} className={styles.meditationSession}>
            <Div className={styles.rowOne}>
                <Text style={styles.date}>{getFormattedDate(meditationSession.dateMs)}</Text>
                <Text style={styles.duration}>{ getFormattedDuration(meditationSession.durationMs)}</Text>
            </Div>
            <Div className={styles.rowTwo}>
                <StarRating rating={meditationSession.rating} color={starColor} emptyColor={emptyColor} starSize={20} onChange={()=> null} animationConfig={{scale: 1}}/>
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
    const trans = dragX.interpolate({
        inputRange: [0, 50, 50, 101],
        outputRange: [-5, 0, 0, 1],
    });
    const animatedStyle = [
        styles.animatedTextDeleteButtonContainer,
        // { transform: [{ translateX: trans }], },
    ]
    return (
        <Div className={styles.rightSwipeContainer}>
            <Animated.Text style={animatedStyle}>
                <IconButton className={styles.deleteButton} iconClassName={styles.deleteButtonIcon} icon={faTrash} size={30} onClick={onDeleteClick}/>
            </Animated.Text>
        </Div>
    );
};


export default MeditationSession;
