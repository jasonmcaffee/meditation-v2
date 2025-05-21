import React, {Component, useEffect, useState} from 'react';
import {FlatList, SafeAreaView, ScrollView, Text, TextInput, Animated} from 'react-native';
import Div from "../../common-components/Div";
// @ts-ignore
import * as styles from '../../style/components/meditation-page/meditation-sessions-page.scss';
import IMeditationSession from "../../models/IMeditationSession";
import meditationSession from "../../services/meditationSession";
import Page from "../../common-components/Page";
import MeditationSession from "./MeditationSession";
import appEventBus from "../../services/appEventBus";

function MeditationSessionsPage(){
    const [meditationSessions, setMeditationSessions] = useState([] as IMeditationSession[]);
    useEffect(()=>{
        refreshMeditationSessions();

        //refresh when any repo changes occur.
        const unregister2 = appEventBus.meditationSessionRepository.meditationSessionsChanged().on(sessions=>{
            console.log(`meditation sessions changed: `, sessions);
            setMeditationSessions([...sessions]);
        })
        return ()=>{  unregister2(); }
    },[]);

    const onDeleteClicked = async (i: IMeditationSession) => {
        await meditationSession.deleteMeditationSession(i);
    };

    const refreshMeditationSessions = async () => {
        console.log(`refresh meditation sessions`);
        const sessions = await meditationSession.getMeditationSessions();
        setMeditationSessions([...sessions]); //must clone array so flatlist gets updated after delete.
    };

    return (
        <Page pageName={'Sessions'}>
            <Div>
                <FlatList onEndReachedThreshold={.5} data={meditationSessions} renderItem={i => { return createSessionEl(i.item, onDeleteClicked)}} keyExtractor={(i) => i.id}/>
            </Div>
        </Page>
    );
};

function createSessionEl(meditationSession: IMeditationSession, onDelete: (i: IMeditationSession)=> Promise<void>){
    return <MeditationSession key={meditationSession.id} meditationSession={meditationSession} onDeleteClick={onDelete}/>
}

export default MeditationSessionsPage;


