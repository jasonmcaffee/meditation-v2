
import appEventBus from "./appEventBus";
import app from "../../App";

export interface IDurationUpdateData{
    hours: number,
    minutes: number,
    seconds: number,
    durationMs: number;
    durationSeconds: number;
    formattedDuration: string;
}

class Stopwatch {
    startTimeMs = 0;
    durationMs = 0; //running total, modified on pause and stop.
    notifyIntervalId = 0;
    isRunning = false;
    isAlarmEnabled = false;
    alarmMinutes = 0;
    hasAlarmAlreadyPlayed = false;

    start(){
        this.isRunning = true;
        this.startTimeMs = Date.now();
        appEventBus.stopwatch.isRunning().set(this.isRunning);
        appEventBus.stopwatch.startPauseChange().set(true);
        let previousDurationData = getDurationDataFromDurationMs(this.getCurrentDurationMs());
        //@ts-ignore
        this.notifyIntervalId = setInterval(()=> {
            const durationData = getDurationDataFromDurationMs(this.getCurrentDurationMs());
            if(previousDurationData.seconds != durationData.seconds){ //only send updates on the second change so we can avoid re-renders.
                // console.log(`previous duration seconds: ${previousDurationData.seconds}  current: ${durationData.seconds}`);
                appEventBus.stopwatch.durationUpdate().set(durationData);
                const totalMinutes = this.getCurrentDurationMs() / 1000 / 60;
                const shouldAlarmPlay = !this.hasAlarmAlreadyPlayed && this.isAlarmEnabled && totalMinutes >= this.alarmMinutes;
                if(shouldAlarmPlay){
                    // audioPlayer.playFile(this.soundFileToPlayAsAlarm);
                    console.log(`timer is completed`);
                    appEventBus.stopwatch.timerCompleted().set(true);
                    this.hasAlarmAlreadyPlayed = true;
                }
            }
            previousDurationData = durationData;

        }, 50);
    }

    setAlarmMinutes(minutes: number){
        this.isAlarmEnabled = minutes > 0;
        this.alarmMinutes = minutes;
    }

    pause(){
        this.isRunning = false;
        appEventBus.stopwatch.isRunning().set(this.isRunning);
        appEventBus.stopwatch.startPauseChange().set(false);
        this.durationMs += Date.now() - this.startTimeMs; //count all the time that has passed.
        clearInterval(this.notifyIntervalId);
    }

    startPause(){
        if(this.isRunning){
            this.pause();
        }else{
            this.start();
        }
    }

    reset(){
        this.pause();
        this.hasAlarmAlreadyPlayed = false;
        this.durationMs = 0;
        this.startTimeMs = 0;
        appEventBus.stopwatch.durationUpdate().set(getDurationDataFromDurationMs(0));
    }

    getCurrentDurationMs(){
        if(this.startTimeMs === 0){ return 0; }
        if(this.isRunning == false){ return this.durationMs; } //useful for Finish so that the current duration is returned.
        return (Date.now() - this.startTimeMs) + this.durationMs;
    }

    getStartTimeMs = ()=> this.startTimeMs

    getDurationData(){
        return getDurationDataFromDurationMs(this.durationMs);
    }
}

function getDurationDataFromDurationMs(durationMs: number): IDurationUpdateData {
    const durationSeconds = durationMs / 1000;
    // const days = Math.floor(durationSeconds / 86400);
    const hours = Math.floor(durationSeconds / 3600);
    const minutes = Math.floor(durationSeconds / 60) % 60;
    const seconds = Math.floor(durationSeconds % 60);
    return {
        hours,
        minutes,
        seconds,
        durationMs,
        durationSeconds,
        formattedDuration: `${zeroFormat(hours)}:${zeroFormat(minutes)}:${zeroFormat(seconds)}`,
    };
}

function zeroFormat(time: number){
    return time > 9 ? time : `0${time}`;
}

const stopwatch = new Stopwatch();
export default stopwatch;