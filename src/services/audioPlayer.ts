import {soundOptions} from "../config/soundFiles";

const Sound = require('react-native-sound');
// Enable playback in silence mode
Sound.setCategory('Playback');
//@ts-ignore use an alias due to TS having issue with value being same name as type Sound
export type S = Sound;

export function createSound(fileName: string): Promise<S>{
    return new Promise<S>((resolve, reject)=>{
       let s = new Sound(fileName, Sound.MAIN_BUNDLE, (error: any) =>{
           if(error){
               console.log(`error in creating react native sound`, error);
               return reject(error);
           }
           resolve(s);
       });
    });
}

/**
 * Note: you can't play the same sound instance more than once at a time, but you can play the same sound with multiple instances.
 */
class AudioPlayer{
    currentSample?: S;
    constructor() {}

    // async playFile({volume, fileName} = {volume: 1, fileName: 'chime.mp3'}): Promise<S>{
    async playFile(fileName:string, volume = 1, shouldLoop = false): Promise<S>{
        const sound = await createSound(fileName);
        if(shouldLoop){
            sound.setNumberOfLoops(-1);
        }
        sound.setVolume(volume);
        playSound(sound);
        return sound;
    }

    async playSample(fileName: string){
        await this.stopCurrentSample();
        this.currentSample = await createSound(fileName);
        return playSound(this.currentSample);
    }

    async stopCurrentSample(){
        if(this.currentSample){
            await this.currentSample.stop();
        }
        this.currentSample = undefined;
    }
}

//await this if you want to know when the sound has been played completely. e.g. after 6 seconds.
async function playSound(sound: S){
    // return sound.play(); <-- not a promise.
    return new Promise<S>((resolve, reject) => {
        sound.play((success: boolean)=>{
            if(success){
                resolve(sound);
            }else{
                reject();
            }
        })
    });
}



const audioPlayer = new AudioPlayer();
export default audioPlayer;

//TrackPlayer is useful for guided meditations.
//another option that's setup in this project.
//Can only play one sound at a time though, but does show the sound on the lock screen, along with artwork.
//import TrackPlayer, {Event} from "react-native-track-player";
// async function playbackService(){
//     TrackPlayer.addEventListener(Event.RemotePlay, () => TrackPlayer.play());
//     TrackPlayer.addEventListener(Event.RemotePause, () => TrackPlayer.pause());
// }
//
// TrackPlayer.registerPlaybackService(() => playbackService);
//
// const chimeTrack = {
//     url: require('../../assets/chime.mp3'), // Load media from the file system.  No spaces allowed!
//     title: 'Chime',
//     artist: 'Jason McAffee',
//     // Load artwork from the file system:
//     artwork: require(`../../artwork/jhana icon.png`),
//     duration: 6
// };
// await TrackPlayer.setupPlayer();
// await TrackPlayer.add([chimeTrack]);
// await TrackPlayer.setVolume(1);
// let trackIndex = await TrackPlayer.getCurrentTrack();
// let trackObject = await TrackPlayer.getTrack(trackIndex!);
// console.log(`Title: ${trackObject?.title}`);
// await TrackPlayer.play();
// TrackPlayer.pause();
// TrackPlayer.reset();
