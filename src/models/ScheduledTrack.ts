import ScheduledSound from "./ScheduledSound";

type Options = {
    scheduledSounds?: []
}

export default class ScheduledTrack{
    isPlaying = false;
    scheduledSounds: ScheduledSound[] = [];
    constructor(scheduledSounds: ScheduledSound[] = []) {
        this.scheduledSounds = scheduledSounds;
    }

    playPause(){
        if(this.isPlaying){
            this.pause();
        }else{
            this.play();
        }
    }
    play(){
        this.isPlaying = true;
        this.scheduledSounds.forEach(s => s.play());
    }
    pause(){
        this.isPlaying = false;
        this.scheduledSounds.forEach(s => s.pause());
    }

    stop(){
        this.isPlaying = false;
        this.scheduledSounds.forEach(s => s.stop());
    }

    addScheduledSound(scheduledSound: ScheduledSound){ this.scheduledSounds.push(scheduledSound); }

    removeScheduledSound(scheduledSound: ScheduledSound){
        const index = this.scheduledSounds.indexOf(scheduledSound);
        this.scheduledSounds.splice(index, 1);
    }
}