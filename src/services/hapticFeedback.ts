import appEventBus from "./appEventBus";
import ReactNativeHapticFeedback from "react-native-haptic-feedback";

const options = {
    enableVibrateFallback: true,
    ignoreAndroidSystemSettings: false
};

class HapticFeedback{
    constructor() {
        appEventBus.hapticFeedback.light().on(p => ReactNativeHapticFeedback.trigger("impactLight", options));
        appEventBus.hapticFeedback.medium().on(p => ReactNativeHapticFeedback.trigger("impactMedium", options));
        appEventBus.hapticFeedback.heavy().on(p => ReactNativeHapticFeedback.trigger("impactHeavy", options));
    }
}

const hapticFeedback = new HapticFeedback();
export default hapticFeedback;