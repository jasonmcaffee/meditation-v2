

// const soundFilesArray = Object.entries(soundFilesIos).map(([key, value]) => value);

export interface ISoundOption{
    file: string,
    label: string,
    durationSeconds: number,
}
//{[k: string]: ISoundOption}
export const soundOptions = {
    chimeGentlePaced: { file: 'chime_gentle_paced.mp3', label: 'Chime - Gentle Paced', durationSeconds: 14 },
    chimeMediumPace: { file: 'chime_medium_paced.mp3', label: 'Chime - Medium Paced', durationSeconds: 18 },
    chimeMediumSingle: { file: 'chime_medium_single.mp3', label: 'Chime - Medium Single', durationSeconds: 6 },
    metalBowlSingGoodLongWooden: { file: 'metal_bowl_sing_good_long_wooden.mp3', label: 'Metal Bowl - Wooden Strike - Long Ring', durationSeconds: 3 * 60 + 17 },
    metalBowlSingQuiet: { file: 'metal_bowl_sing_quiet.mp3', label: 'Metal Bowl - Sing Quiet', durationSeconds: 1 * 60 + 14 },
    metalBowlStrikeHard2Gong: { file: 'metal_bowl_strike_hard2_gong.mp3', label: 'Metal Bowl - Strike Hard - Gong', durationSeconds: 25 },
    metalBowlStrikeMedium7Deep: { file: 'metal_bowl_strike_medium7_deep.mp3', label: 'Metal Bowl - Strike Medium - Deep', durationSeconds: 21 },
    metalBowlStrikeMedium18Vibrato: { file: 'metal_bowl_strike_medium18_vibrato.mp3', label: 'Metal Bowl - Strike Medium - Vibrato', durationSeconds: 28 },
    metalBowlStrikeSoft6: { file: 'metal_bowl_strike_soft6.mp3', label: 'Metal Bowl - Strike Soft', durationSeconds: 25 },
    chime: { file: 'chime.mp3', label: 'Chime - Medium Single 2', durationSeconds: 6 },
    softStream: {file: 'soft_stream.mp3', label: 'Stream - Soft', durationSeconds: 4 * 60 + 35},
    mediumStream: {file: 'medium_stream.mp3', label: 'Stream - Medium', durationSeconds: 7 * 60 + 23},
    strongStream: {file: 'strong_stream.mp3', label: 'Stream - Strong', durationSeconds: 4 * 60 + 50},
}

export const soundOptionsArray = Object.entries(soundOptions).map(([key, value]) => value);