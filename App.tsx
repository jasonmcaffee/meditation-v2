import React, {ReactNode, useEffect, useState} from 'react';
import TimePage from "./src/components/time-page/TimePage";
import MeditationSessionsPage from "./src/components/meditation-sessions-page/MeditationSessionsPage";
import "react-native-gesture-handler";
import { GestureHandlerRootView } from 'react-native-gesture-handler';
import './src/services/audioNotifications';
import "./src/services/appEventBus";
import "./src/services/hapticFeedback";
import appEventBus from "./src/services/appEventBus";
// import  './src/style/common.scss'; //fix? https://github.com/kristerkari/react-native-sass-transformer/issues/9
import Sound from 'react-native-sound';
console.log(Sound.MAIN_BUNDLE); // Should print 'NSBundle mainBundle'
Sound.setCategory('Playback');
//have a single instance to prevent flash
const timePage = <TimePage/>;
const meditationSessionPage = <MeditationSessionsPage/>;

const App = () => {

  const [modal, setModal] = useState<ReactNode>();
  useEffect(()=>{
    return appEventBus.app.showModal().on(modalToShow =>{
      setModal(modalToShow);
    });
  }, []);

  return (
    <GestureHandlerRootView style={{ flex: 1 }}>
      <React.Fragment>
        {timePage}
        {meditationSessionPage}
        {modal}
      </React.Fragment>
    </GestureHandlerRootView>
  );
};
export default App;
