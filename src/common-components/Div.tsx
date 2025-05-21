import React, {PropsWithChildren} from "react";
import {Pressable, StyleProp, ViewStyle} from "react-native";

type Props = PropsWithChildren<{
    className?: StyleProp<ViewStyle>,
    onClick?: ()=> void,
}>;

function Div({children, className = null, onClick}: Props) {
    return <Pressable onPress={onClick} style={className}>
        {children}
    </Pressable>;
}

export default Div;