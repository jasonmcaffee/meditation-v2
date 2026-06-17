import {useEffect, useState} from "react";
import {Keyboard, KeyboardEvent, Platform} from "react-native";

/**
 * Track the on-screen keyboard height so a modal can resize to sit just above it. Uses the
 * will-show/hide events on iOS (they fire before the animation, giving a smoother resize) and
 * the did-show/hide events on Android. Returns 0 when the keyboard is dismissed.
 */
export default function useKeyboardHeight(): number {
    const [height, setHeight] = useState(0);
    useEffect(() => {
        const showEvent = Platform.OS === 'ios' ? 'keyboardWillShow' : 'keyboardDidShow';
        const hideEvent = Platform.OS === 'ios' ? 'keyboardWillHide' : 'keyboardDidHide';
        const showSub = Keyboard.addListener(showEvent, (e: KeyboardEvent) => setHeight(e.endCoordinates.height));
        const hideSub = Keyboard.addListener(hideEvent, () => setHeight(0));
        return () => { showSub.remove(); hideSub.remove(); };
    }, []);
    return height;
}
