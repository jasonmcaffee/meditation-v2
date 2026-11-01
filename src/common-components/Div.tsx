import React, {PropsWithChildren} from "react";
import {Pressable, StyleProp, ViewStyle} from "react-native";

type Props = PropsWithChildren<{
    className?: StyleProp<ViewStyle>,
    onClick?: ()=> void,
    testID?: string,
    accessible?: boolean,
}>;

/**
 * A pressable container. Set accessible={false} on one that wraps other controls: on iOS an accessible
 * Pressable is a single accessibility element, which hides everything inside it from VoiceOver and
 * from UI tests.
 * @param accessible - whether the container is one accessibility element (React Native's default, true)
 */
function Div({children, className = null, onClick, testID, accessible}: Props) {
    return <Pressable onPress={onClick} style={className} testID={testID} accessible={accessible}>
        {children}
    </Pressable>;
}

export default Div;
