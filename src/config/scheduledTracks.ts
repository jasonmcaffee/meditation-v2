import ScheduledTrack from "../models/ScheduledTrack";
import ScheduledSound from "../models/ScheduledSound";
import {ISoundOption, soundOptions} from "./soundFiles";

const {metalBowlSingQuiet, metalBowlStrikeSoft6, metalBowlStrikeHard2Gong, metalBowlStrikeMedium7Deep, metalBowlStrikeMedium18Vibrato, chimeMediumSingle, chimeMediumPace, chime, metalBowlSingGoodLongWooden, chimeGentlePaced, softStream, strongStream, mediumStream} = soundOptions;

function f(option: ISoundOption, minutes?: number, playImmediately = true, shouldLoop = false,  volume = 1){
    const playEveryNms = minutes ? minutes * 60 * 1000 : undefined;
    return new ScheduledSound({shouldLoop, playEveryNms, soundOption: option, playImmediately, volume});
}

const metalBowlSingQuietLoop = new ScheduledSound({soundOption: metalBowlSingQuiet, shouldLoop: true});
const metalBowlSingQuietEveryMinute = new ScheduledSound({soundOption: metalBowlSingQuiet, playEveryNms: 60 * 1000, playImmediately: true});
const metalBowlStrikeSoft6Every5Minutes = new ScheduledSound({soundOption: metalBowlStrikeSoft6, playEveryNms: 5 * 60 * 1000, playImmediately: true});
const metalBowlStrikeSoft6Every1Minute = new ScheduledSound({soundOption: metalBowlStrikeSoft6, playEveryNms: 60 * 1000, playImmediately: true});
const scheduledSound3 = new ScheduledSound({soundOption: chime, playEveryNms: 4000});
const softStreamLoop = new ScheduledSound({soundOption: softStream, shouldLoop: true});
const chimeEvery5Minutes = new ScheduledSound({soundOption: chime, playEveryNms: 5 * 60 * 1000, playImmediately: true});
const scheduledTrackNone = new ScheduledTrack();
const streamAndBowlAndChime = new ScheduledTrack([metalBowlSingQuietEveryMinute, softStreamLoop, chimeEvery5Minutes]);
const streamAndSoftStrike = new ScheduledTrack([softStreamLoop, metalBowlStrikeSoft6Every1Minute, chimeEvery5Minutes]);

export interface IScheduledTrackOption {
    id: string; //needed for serialization when saving user prefs.
    value: ScheduledTrack;
    label: string;
    description?: string;
}

export function scheduledTrackOptionToJson(scheduledTrackOption: IScheduledTrackOption){
    const json = {id: scheduledTrackOption.id};
    return json;
}

export function scheduledTrackOptionFromJson(json: object): IScheduledTrackOption | undefined{
    // @ts-ignore
    const id = json && json.id ? json.id : '1';
    const result = scheduledTrackOptionsArray.find(i => i.id = id);
    return result;
}

export const scheduledTrackOptionsArray: IScheduledTrackOption[] = [
    {id: '1', label: 'No Background Audio', value: scheduledTrackNone, description: `No background audio.`},
    {
        id: '2',
        label: 'Metal Bowl Strike Every Minute',
        description: 'A soft metal bowl strike done every minute',
        value: new ScheduledTrack([
            metalBowlStrikeSoft6Every1Minute
        ])
    },
    {
        id: '3',
        label: 'Metal Bowl Singing Long',
        description: `Metal bowl signs on loop for 3:17.  Chime plays every 5 minutes.`,
        value: new ScheduledTrack([
            f(metalBowlSingGoodLongWooden, undefined, true, true),
            chimeEvery5Minutes
        ])
    },
    {
        id: '4',
        label: 'Strong Stream',
        description: `Loud stream plays on loop for 4:50.  Soft metal bowl strike every 5 minutes.`,
        value: new ScheduledTrack([
            f(strongStream, undefined, true, true),
            metalBowlStrikeSoft6Every5Minutes,
        ])
    },
    {
        id: '5',
        label: 'Medium Stream',
        description: `Medium stream plays on loop for 7:23.  Soft metal bowl strike every 5 minutes.`,
        value: new ScheduledTrack([
            f(mediumStream, undefined, true, true),
            metalBowlStrikeSoft6Every5Minutes
        ])
    },
    {
        id: '6',
        label: 'Soft Stream with Metal Bowl Singing',
        description: `Soft stream with metal bowl signing on loop.  Chime rings every 5 minutes.  Bowl strike every minute`,
        value: streamAndBowlAndChime,
    },
    {
        id: '7',
        label: 'Soft Stream with Strike Every Minute',
        description: `Soft stream plays on loop.  Soft bowl strike every minute`,
        value: streamAndSoftStrike
    },
]

