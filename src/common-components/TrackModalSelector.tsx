import React, {PropsWithChildren} from "react";
import {Pressable, StyleProp, ViewStyle, Text, View} from "react-native";
//@ts-ignore
import * as styles from '../style/common-components/track-modal-selector.scss';
import  '../style/common-components/modal-selector.scss';
import  '../style/common.scss';

import Div from "./Div";
import Modal from "./Modal";
import appEventBus from "../services/appEventBus";
import {IScheduledTrackOption} from "../config/scheduledTracks";


type OptionRowClick<TOption> = (option:TOption) => void;
type RenderOption<TOption> = (option: TOption, onOptionRowClick?: OptionRowClick<TOption>) => React.ReactNode;

type Props = {
    className?: StyleProp<ViewStyle>,
    options: IScheduledTrackOption[],
    currentOption: IScheduledTrackOption,
    renderOption?: RenderOption<IScheduledTrackOption>,
    onOptionRowClick?: OptionRowClick<IScheduledTrackOption>
};

function TrackModalSelector({currentOption, className = null, options, renderOption=defaultRenderOption, onOptionRowClick}: Props) {
    //update state and close modal.
    function mandatoryOnOptionClick(option: IScheduledTrackOption){
        appEventBus.app.showModal().set(null);
        appEventBus.hapticFeedback.light().set(true);
        onOptionRowClick && onOptionRowClick(option);
    }

    const onModalSelectorClick = ()=> {
        appEventBus.app.showModal().set(modalEl);
        appEventBus.hapticFeedback.light().set(true);
    }
    const onModalCloseClick = ()=> {
        appEventBus.app.showModal().set(null);
        appEventBus.hapticFeedback.light().set(true);
    }

    const modalEl = createModal(options, mandatoryOnOptionClick, renderOption, onModalCloseClick, styles.trackModal, styles.modalWindow);

    //TODO: JUST FOR DEVELOPMENT ONLY DUE TO METRO NOT REFRESHING.
    // if(appEventBus.app.showModal().get() !== null){
    //     appEventBus.app.showModal().set(modalEl);
    // }

    return <Pressable onPress={onModalSelectorClick} style={[styles.trackModalSelector,className]}>
        <Text style={styles.trackModalSelectorText}>{currentOption.label}</Text>
    </Pressable>;
}

function createModal(options: IScheduledTrackOption[], mandatoryOnClick: OptionRowClick<IScheduledTrackOption>, renderOption: RenderOption<IScheduledTrackOption>,  onModalCloseClick: ()=> void, modalClassName: StyleProp<ViewStyle>, modalWindowClassName: StyleProp<ViewStyle>){
    const optionEls = createOptionEls(options, mandatoryOnClick, renderOption);
    return <Modal showCloseButton={false} className={modalClassName} windowClassName={modalWindowClassName} onCloseClick={onModalCloseClick}>
        {optionEls}
    </Modal>
}

function createOptionEls(options: IScheduledTrackOption[], mandatoryOnClick: OptionRowClick<IScheduledTrackOption>, renderOption: RenderOption<IScheduledTrackOption>){
    return options.map( (o, i) => createRenderOptionWrapper(o, i, mandatoryOnClick, renderOption));
}

function createRenderOptionWrapper(option: IScheduledTrackOption, index: number, mandatoryOnClick: OptionRowClick<IScheduledTrackOption>, renderOption: RenderOption<IScheduledTrackOption> ){
    return <View key={`optionRowWrapper${index}`} style={styles.trackOptionRowWrapper}>
        {renderOption(option, mandatoryOnClick)}
    </View>
}

function defaultRenderOption(option: IScheduledTrackOption, onOptionRowClick?: OptionRowClick<IScheduledTrackOption>){
    return <Pressable style={styles.trackDefaultOptionRow} onPress={() => onOptionRowClick && onOptionRowClick(option) }>
        <Text style={styles.trackLabelText}>{option.label}</Text>
        <Text style={styles.trackDescriptionText}>{option.description}</Text>
    </Pressable>
}


export default TrackModalSelector;