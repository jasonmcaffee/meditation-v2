import React, {PropsWithChildren} from "react";
import {Pressable, StyleProp, ViewStyle} from "react-native";
//@ts-ignore
import * as styles from '../style/common-components/t-dropdown.scss';
import Div from "./Div";
import SelectDropdown from "react-native-select-dropdown";
import appEventBus from "../services/appEventBus";

export interface IDropDownOption<TValue> {
    value: TValue;
    label: string;
}

type Props<TValue, TOption extends IDropDownOption<TValue>> = {
    className?: StyleProp<ViewStyle>,
    currentOption: TOption,
    options: TOption[],
    onSelected: (o: TOption) => void
};

function TDropDown<TValue, TOption extends IDropDownOption<TValue>>({className = null, onSelected, options, currentOption}: Props<TValue, TOption>) {
    return <Div className={className}>
        <SelectDropdown
            buttonStyle={styles.buttonStyle}
            buttonTextStyle={styles.buttonTextStyle}
            dropdownStyle={styles.dropDownStyle}
            rowStyle={styles.dropDownChildRow}
            rowTextStyle={styles.dropDownChildRowText}
            // renderCustomizedRowChild={(item) => {
            //     return <Div className={styles.dropDownChildRow}>
            //         <Text style={styles.dropDownChildRowText}>{item}</Text>
            //     </Div>
            // }}
            defaultButtonText={currentOption.label}
            defaultValue={currentOption}
            data={options}
            onSelect={(selectedItem, index) => {
                console.log(selectedItem, index);
                appEventBus.hapticFeedback.light().set(true);
                onSelected(selectedItem);
            }}
            buttonTextAfterSelection={(selectedItem, index) => {

                // text represented after item is selected
                // if data array is an array of objects then return selectedItem.property to render after item is selected
                return selectedItem.label;
            }}
            rowTextForSelection={(item, index) => {
                // text represented for each item in dropdown
                // if data array is an array of objects then return item.property to represent item in dropdown
                return item.label;
            }}
        />
    </Div>
}

export default TDropDown;