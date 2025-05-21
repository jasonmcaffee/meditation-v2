import React, {PropsWithChildren, useState} from "react";
import {Pressable, StyleProp, ViewStyle, View, Text} from "react-native";
//@ts-ignore
import * as styles from '../style/common-components/sound-select-dropdown.scss';
import {ISoundOption, soundOptionsArray} from "../config/soundFiles";
import SelectDropdown from "react-native-select-dropdown";
import {faPlay} from "@fortawesome/free-solid-svg-icons/faPlay";
import {faStop} from "@fortawesome/free-solid-svg-icons/faStop";
import IconButton from "./IconButton";
import audioPlayer from "../services/audioPlayer";

type Props = PropsWithChildren<{
    currentValue: ISoundOption,
    options?: ISoundOption[],
    onOptionSelected: (soundOption: ISoundOption) => void,
    // className?: StyleProp<ViewStyle>,
}>;

function SoundSelectDropDown({currentValue, options, onOptionSelected}: Props) {
    options = options || soundOptionsArray;
    const [selectOptionSamplePlaying, setSelectOptionSamplePlaying] = useState<ISoundOption>();

    async function handleSoundOptionClick(option: ISoundOption){
        if(option == selectOptionSamplePlaying){ //already playing
            await audioPlayer.stopCurrentSample();
            setSelectOptionSamplePlaying(undefined);
        }else{ //start playing
            setSelectOptionSamplePlaying(option);
            await audioPlayer.playSample(option.file);
        }
    }

    return <View style={styles.soundSelectDropDown}>
        <SelectDropdown
            onBlur={ () => { setSelectOptionSamplePlaying(undefined); audioPlayer.stopCurrentSample() }}
            buttonStyle={styles.buttonStyle}
            buttonTextStyle={styles.buttonTextStyle}
            dropdownStyle={styles.dropDownStyle}
            rowStyle={styles.dropDownChildRow}
            rowTextStyle={styles.dropDownChildRowText}
            renderCustomizedRowChild={(item) => SoundOptionEl(item, handleSoundOptionClick, selectOptionSamplePlaying) }
            defaultButtonText={currentValue.label}
            defaultValue={currentValue}
            data={options}
            onSelect={(selectedItem, index) => {  onOptionSelected(selectedItem); }}
            // text represented after item is selected
            // if data array is an array of objects then return selectedItem.property to render after item is selected
            buttonTextAfterSelection={(selectedItem, index) => selectedItem.label }
            // text represented for each item in dropdown
            // if data array is an array of objects then return item.property to represent item in dropdown
            rowTextForSelection={(item, index) =>  item.label}
        />
    </View>;
}

function SoundOptionEl(soundOption: ISoundOption, onPlayStopClick: (option: ISoundOption)=> void, selectOptionSamplePlaying?: ISoundOption){
    const icon = soundOption == selectOptionSamplePlaying ? faStop : faPlay;
    return <View style={styles.dropDownChildRow}>
        <IconButton icon={icon} className={styles.playButton} iconClassName={styles.playButtonIcon} onClick={() => onPlayStopClick(soundOption)}/>
        <Text style={styles.dropDownChildRowText}>{soundOption.label}</Text>
    </View>
}

export default SoundSelectDropDown;