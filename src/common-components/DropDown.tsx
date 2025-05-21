import React, {PropsWithChildren} from "react";
import {TouchableOpacity, Text, StyleProp, ViewStyle} from "react-native";
import SelectDropdown from "react-native-select-dropdown";
//@ts-ignore
import * as styles from '../style/common-components/dropdown.scss';
import Div from "./Div";
import appEventBus from "../services/appEventBus";

type Props = PropsWithChildren<{
    value?: any,
    className?: StyleProp<ViewStyle>,
    onSelected: (item: any)=> void,
    data: Array<any>,
    label?: string
}>;

function DropDown({value, label, children, className = null, onSelected, data}: Props){

    return <Div className={className}>
        <SelectDropdown
            onFocus={() => appEventBus.hapticFeedback.light().set(true)}
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
            defaultButtonText={"0" + (label ? ` ${label}`: '')}
            defaultValue={value}
            data={data}
            onSelect={(selectedItem, index) => {
                console.log(selectedItem, index);
                appEventBus.hapticFeedback.light().set(true);
                onSelected(selectedItem);
            }}
            buttonTextAfterSelection={(selectedItem, index) => {

                // text represented after item is selected
                // if data array is an array of objects then return selectedItem.property to render after item is selected
                return selectedItem + (label ? ` ${label}`: '');
            }}
            rowTextForSelection={(item, index) => {
                // text represented for each item in dropdown
                // if data array is an array of objects then return item.property to represent item in dropdown
                return item
            }}
        />
    </Div>
}
//onClick={function(){ onSelected(item) }}
export default DropDown;