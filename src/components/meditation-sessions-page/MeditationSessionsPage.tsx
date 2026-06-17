import React, {useEffect, useState} from 'react';
import {FlatList} from 'react-native';
import Div from "../../common-components/Div";
// @ts-ignore
import * as styles from '../../style/components/meditation-page/meditation-sessions-page.scss';
import IMeditationSession from "../../models/IMeditationSession";
import meditationSession from "../../services/meditationSession";
import Page from "../../common-components/Page";
import MeditationSession from "./MeditationSession";
import appEventBus from "../../services/appEventBus";

/**
 * Page listing all saved meditation sessions, refreshing whenever the repository changes.
 */
function MeditationSessionsPage(){
    const [meditationSessions, setMeditationSessions] = useState([] as IMeditationSession[]);

    useEffect(()=>{
        refreshMeditationSessions();

        const unregister2 = appEventBus.meditationSessionRepository.meditationSessionsChanged().on(sessions=>{
            console.log(`meditation sessions changed: `, sessions);
            setMeditationSessions([...sessions]);
        });
        return () => { unregister2(); };
    },[]);

    const onDeleteClicked = async (i: IMeditationSession) => {
        await meditationSession.deleteMeditationSession(i);
    };

    const refreshMeditationSessions = async () => {
        console.log(`refresh meditation sessions`);
        const sessions = await meditationSession.getMeditationSessions();
        setMeditationSessions([...sessions]);
    };

    return (
        <Page pageName={'Sessions'}>
            <FlatList
                contentContainerStyle={styles.listContent}
                onEndReachedThreshold={0.5}
                data={meditationSessions}
                renderItem={i => <MeditationSession key={i.item.id} meditationSession={i.item} onDeleteClick={onDeleteClicked}/>}
                keyExtractor={(i) => i.id}
            />
        </Page>
    );
}

export default MeditationSessionsPage;
