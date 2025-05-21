import React, {PropsWithChildren} from "react";
import {Pressable, StyleProp, ViewStyle, View} from "react-native";
//@ts-ignore
import * as styles from '../style/common-components/scheduled-sound-builder.scss';

type Props = {};

function ScheduledSoundBuilder({}: Props) {
    return <View style={styles.scheduledSoundBuilder}></View>;
}

export default ScheduledSoundBuilder;