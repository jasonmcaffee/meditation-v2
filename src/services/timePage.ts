import stopwatch  from "./stopwatch";
import {useState} from "react";
import FinishSessionModal from "../components/time-page/FinishSessionModal";
import IMeditationSession from "../models/IMeditationSession";
import meditationSessionRepository from "../repository/meditationSessionRepository";
import {pageState} from "../react-utils/proxyUseState";
import {soundOptionsArray} from "../config/soundFiles";
import {IScheduledTrackOption, scheduledTrackOptionsArray} from "../config/scheduledTracks";

class TimePage{
    setAlarmMinutes = (m: number) => {};
    setIsAlarmEnabled = (s: boolean) => {};
    minuteOptions = [0, 5, 10, 15, 20, 25, 30, 35, 40, 45, 50, 55]; //todo: 60 minutes here makes 1 hour and 60 minutes.
    hourOptions = [0, 1, 2, 3, 4, 5, 6, 7, 8, 9, 10, 11, 12, 13, 14, 15, 16, 17, 18, 19, 20, 21, 22, 23, 24];
    scheduledTrackOptions = scheduledTrackOptionsArray;
    state = {
        selected: 1,
        shouldDisplayFinishSessionModal: false,
        shouldDisplaySoundSettingsModal: false,
        durationData: stopwatch.getDurationData(),
        isStopWatchRunning: stopwatch.isRunning,
        meditationSession: undefined as undefined | IMeditationSession,
        selectedSoundOption: soundOptionsArray[0],
        selectedScheduledTrackOption: scheduledTrackOptionsArray[0],
    };
    pageState?: TimePage['state']; //I don't want to have to type out this Type somewhere else, so I can just reference the definition place
    usePageState(){
        this.pageState = pageState(this.state);
        return this.pageState;
    }
    async startPauseStopwatch(){
        stopwatch.startPause();
        this.pageState!.selectedScheduledTrackOption.value.playPause();
    }

    setSelectedScheduledTrackOption(scheduledTrackOption: IScheduledTrackOption){
        this.pageState?.selectedScheduledTrackOption.value.stop();
        this.pageState!.selectedScheduledTrackOption = scheduledTrackOption;
        if(stopwatch.isRunning){
            scheduledTrackOption.value.play(); //this.pageState!.selectedScheduledTrackOption still represents the old one for some reason.
        }
    }

    //when the finish button is pressed, show a modal and prompt for notes, rating, etc.
    finishSession(){
        const durationMs = stopwatch.getCurrentDurationMs();
        const createdDateMs = stopwatch.getStartTimeMs();
        this.pageState!.selectedScheduledTrackOption.value.stop();
        stopwatch.reset();
        this.pageState!.meditationSession = createMeditationSessionBasedOnDurationData(durationMs, createdDateMs);
        //show modal
        this.pageState!.shouldDisplayFinishSessionModal = true;
    }

    async saveSession(notes: string, rating: number){
        try {
            const session = this.pageState!.meditationSession;
            if(!session) { return console.warn('[timePage] saveSession: no meditationSession set'); }
            console.log('[timePage] saveSession called', { notes, rating, sessionId: session.id });
            session.notes = notes;
            session.rating = rating;
            await meditationSessionRepository.saveMeditationSession(session);
            console.log('[timePage] saveSession complete');
            this.pageState!.meditationSession = undefined;
            this.pageState!.shouldDisplayFinishSessionModal = false;
        } catch(e) {
            console.error('[timePage] saveSession error:', e);
        }
    }

    useIsAlarmEnabled(){
        const [isAlarmEnabled, setIsAlarmEnabled] = useState(stopwatch.isAlarmEnabled);
        this.setIsAlarmEnabled = function(val){
            stopwatch.isAlarmEnabled = val;
            setIsAlarmEnabled(val);
        }
        return isAlarmEnabled;
    }

    useAlarmMinutes(){
        const [alarmMinutes, setAlarmMinutes] = useState(stopwatch.alarmMinutes);
        this.setAlarmMinutes = function(minutes){
            stopwatch.setAlarmMinutes(minutes);
            this.setIsAlarmEnabled(stopwatch.isAlarmEnabled);
            setAlarmMinutes(stopwatch.alarmMinutes);
        }
        return alarmMinutes;
    }

    setAlarmMinutesFromHoursAndMinutes(hours: number, minutes: number){
        const value = (hours * 60) + minutes;
        this.setAlarmMinutes(value);
    }

}

function createMeditationSessionBasedOnDurationData(durationMs: number, dateMs: number){
    const meditationSession: IMeditationSession = {
        id: Date.now().toString(),
        durationMs,
        dateMs,
        notes: '',
        rating: 0,
    };
    return meditationSession;

}

const timePage = new TimePage();
export default timePage;