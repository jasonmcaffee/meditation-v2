import appEventBus from "./appEventBus";
import audioPlayer from "./audioPlayer";
import {soundOptions} from "../config/soundFiles";

class AudioNotifications{
    soundFileToPlayAsAlarm?: string = soundOptions.chimeGentlePaced.file;
    soundFileToPlayOnStartPause?: string = soundOptions.metalBowlStrikeHard2Gong.file;
    constructor() {
        appEventBus.stopwatch.timerCompleted().on(didComplete => {
            if(this.soundFileToPlayAsAlarm){  audioPlayer.playFile(this.soundFileToPlayAsAlarm); }
        });

        appEventBus.stopwatch.startPauseChange().on(isStart => {
            // if(this.soundFileToPlayOnStartPause){ audioPlayer.playFile(this.soundFileToPlayOnStartPause); }
        });
    }
}

const audioNotifications = new AudioNotifications();
export default audioNotifications