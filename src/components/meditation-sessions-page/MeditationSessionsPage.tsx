import React, {useEffect, useState} from 'react';
import {ActivityIndicator, FlatList, Text} from 'react-native';
import Div from "../../common-components/Div";
// @ts-ignore
import * as styles from '../../style/components/meditation-page/meditation-sessions-page.scss';
import IMeditationSession from "../../models/IMeditationSession";
import meditationSession from "../../services/meditationSession";
import Page from "../../common-components/Page";
import MeditationSession from "./MeditationSession";
import appEventBus from "../../services/appEventBus";
import IconButton from "../../common-components/IconButton";
import DataModal from "../data-page/DataModal";

/** Opens the Data screen (storage, conversion and backups) as the app's modal. */
export function showDataModal(){
    appEventBus.app.showModal().set(<DataModal onCloseClick={() => appEventBus.app.showModal().set(null)}/>);
}

/**
 * Page listing all saved meditation sessions, refreshing whenever the repository changes.
 */
function MeditationSessionsPage(){
    const [meditationSessions, setMeditationSessions] = useState([] as IMeditationSession[]);
    // The first load waits for the storage bootstrap, which converts sessions.txt on the first launch
    // of this version; say so rather than show an empty list.
    const [loaded, setLoaded] = useState(false);

    useEffect(()=>{
        refreshMeditationSessions()
            .catch(e => console.error('[sessions] could not load sessions', e))
            .finally(() => setLoaded(true));

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
            <Div className={styles.header}>
                <IconButton name="database-outline" size={20} onClick={showDataModal} testID="data-button"/>
            </Div>
            {loaded ? null : <Div className={styles.loading} testID="sessions-loading">
                <ActivityIndicator color="#ffffff"/>
                <Text style={styles.loadingText}>Loading your sessions…</Text>
            </Div>}
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
