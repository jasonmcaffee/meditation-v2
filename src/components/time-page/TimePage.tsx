import React, {useEffect} from 'react';
import {StyleSheetProperties,  Text, useWindowDimensions} from 'react-native';
import Div from "../../common-components/Div";
import Button from "../../common-components/Button";
// @ts-ignore
import * as styles from '../../style/components/time-page/time-page.scss';
import Page from "../../common-components/Page";
import IconButton from "../../common-components/IconButton";
import {faBell} from "@fortawesome/free-regular-svg-icons";
import {faPause} from "@fortawesome/free-solid-svg-icons/faPause";
import {faPlay} from "@fortawesome/free-solid-svg-icons/faPlay";
import {faGear} from "@fortawesome/free-solid-svg-icons/faGear";
import timePage from "../../services/timePage";
import FinishSessionModal from "./FinishSessionModal";
import {IDurationUpdateData} from "../../services/stopwatch";
import DropDown from "../../common-components/DropDown";
import SoundSettingsModal from "./SoundSettingsModal";
import appEventBus from "../../services/appEventBus";
import createUnregisterFunction from "../../react-utils/createUnregisterFunction";
import SoundSelectDropDown from "../../common-components/SoundSelectDropDown";
import TDropDown from "../../common-components/TDropDown";
import ModalSelector from "../../common-components/ModalSelector";
import TrackModalSelector from "../../common-components/TrackModalSelector";

function TimePage(){
    const state = timePage.usePageState();

    const screenHeight = useWindowDimensions().height; // Dimensions.get('window').height;
    const screenWidth = useWindowDimensions().width; //Dimensions.get('window').width;
    const isAlarmEnabled = timePage.useIsAlarmEnabled();
    const alarmMinutes = timePage.useAlarmMinutes();
    const {hours, minutes} = convertMinutesToHoursAndMinutes(alarmMinutes);

    //not possible to calculate with rn css, so have to do it with js.
    const timerTimeStyle = createTimerTimeStyle(screenWidth, screenHeight, styles.timerTime);

    //modals
    const finishSessionModal = state.shouldDisplayFinishSessionModal && state.meditationSession ? <FinishSessionModal meditationSession={state.meditationSession} onCloseClick={() => state.shouldDisplayFinishSessionModal = false} onSaveClick={(notes, rating) => timePage.saveSession(notes, rating)}/> : null;
    const soundSettingsModal = state.shouldDisplaySoundSettingsModal ? <SoundSettingsModal onCloseClick={() => state.shouldDisplaySoundSettingsModal = false}/> : null;

    useEffect(()=>{
        return createUnregisterFunction(
            appEventBus.stopwatch.durationUpdate().on(durationUpdateData => state.durationData = durationUpdateData),
            appEventBus.stopwatch.isRunning().on(isRunning => state.isStopWatchRunning = isRunning)
        );
    }, []);

    return (
        <Page pageName={'Timer'} modal={finishSessionModal || soundSettingsModal}>
            <Div className={styles.timer}>
                <Div className={styles.rowOne}>
                    <Div className={styles.hoursAndMinutes}>
                        <IconButton icon={faBell} className={styles.bellIconButton} iconClassName={isAlarmEnabled ? styles.bellIconButtonIcon : styles.bellIconButtonIconDisabled}/>
                        <DropDown value={hours} onSelected={(h)=>{ timePage.setAlarmMinutesFromHoursAndMinutes(h, minutes); }} data={timePage.hourOptions} label={"hours"} className={styles.hours}/>
                        <DropDown value={minutes} onSelected={(m)=>{ timePage.setAlarmMinutesFromHoursAndMinutes(hours, m); }} data={timePage.minuteOptions} label={"min"}/>
                        <IconButton icon={faGear} className={styles.bellIconButton} iconClassName={styles.gearIconButtonIcon} onClick={()=> state.shouldDisplaySoundSettingsModal = true }/>
                    </Div>
                    <Div className={timerTimeStyle}>
                        {createTimeEl(state.durationData)}
                    </Div>
                </Div>
                <Div className={styles.rowTwo}>
                    <TrackModalSelector options={timePage.scheduledTrackOptions} currentOption={state.selectedScheduledTrackOption} onOptionRowClick={o => timePage.setSelectedScheduledTrackOption(o) }/>
                    {/*<TDropDown currentOption={state.selectedScheduledTrackOption} options={timePage.scheduledTrackOptions} onSelected={o => state.selectedScheduledTrackOption = o }/>*/}
                    <Div className={styles.timerButtons}>
                        <Div className={styles.timerButtonsColumn}>
                            <IconButton icon={state.isStopWatchRunning ? faPause : faPlay} className={styles.timerButton} iconClassName={styles.timerButtonIcon} onClick={() => timePage.startPauseStopwatch()}/>
                        </Div>
                        <Div className={styles.timerButtonsColumn}>
                            <Button text={"Finish"} className={styles.timerButton} onClick={()=> timePage.finishSession()}/>
                        </Div>
                    </Div>
                </Div>
            </Div>
        </Page>
    );
};

function createTimeEl(durationData: IDurationUpdateData){
    const chars = durationData.formattedDuration.split("");
    const els = chars.map( (c, i) => <Text key={i} adjustsFontSizeToFit style={styles.timeTextChar}>{c}</Text>);
    return <Div className={styles.timeTextCharContainer}>{els}</Div>
}

function createTimerTimeStyle(screenWidth: number, screenHeight: number, timerTimeStyleSheet: StyleSheetProperties){
    //not possible to calculate with rn css, so have to do it with js.
    const circleDiameter = (screenWidth < screenHeight ? screenWidth - 50 : screenHeight - 100);
    return {
        ...timerTimeStyleSheet,
        width: circleDiameter,
        height: circleDiameter,
        borderRadius: circleDiameter / 2,
    };
}

function convertMinutesToHoursAndMinutes(minutes: number){
    // if(minutes <= 60) { return {hours: 0, minutes: 0}}
    const hours = Math.floor(minutes / 60);
    const remainingMinutes = minutes % 60;
    return {hours, minutes: remainingMinutes};
}

export default TimePage;
