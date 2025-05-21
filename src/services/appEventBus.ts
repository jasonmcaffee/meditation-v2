import {IDurationUpdateData} from "./stopwatch";
import {createObserverProxy} from "./EventBus";
import IMeditationSession from "../models/IMeditationSession";
import {ReactNode} from "react";

class AppEvents{
    stopwatch = {
        durationUpdate: {} as IDurationUpdateData,
        isRunning: false,
        timerCompleted: false,
        startPauseChange: false,
    }
    meditationSessionRepository = {
        meditationSessionsChanged: [] as IMeditationSession[],
    }
    navigation = {
        goToPage: 'Timer'
    }
    app = {
        showModal: {} as ReactNode
    }
    hapticFeedback = {
        light: false,
        medium: false,
        heavy: false,
    }
}

const appEventBus = createObserverProxy(new AppEvents());
export default appEventBus;

