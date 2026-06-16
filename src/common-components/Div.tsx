import React, {PropsWithChildren} from "react";
import {Pressable, StyleProp, ViewStyle} from "react-native";

type Props = PropsWithChildren<{
    className?: StyleProp<ViewStyle>,
    onClick?: ()=> void,
    testID?: string,
}>;

function Div({children, className = null, onClick, testID}: Props) {
    return <Pressable onPress={onClick} style={className} testID={testID}>
        {children}
    </Pressable>;
}

export default Div;
