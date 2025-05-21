import "jest";
import {useState, Fragment, useEffect, Dispatch, SetStateAction} from "react";
import renderer from 'react-test-renderer';
import {Text, View} from "react-native";
import {pageState} from "../../react-utils/proxyUseState";

describe('proxyUseState', ()=>{

    test('pageState', async ()=>{
        function TestEl(){
            const state = pageState({
                value1: 123,
                value2: 'abc',
            });

            useEffect(() => {
                state.value2 = 'great';
                expect(state.value1).toBe(123);
                expect(state.value2).toBe('great');
                state.value1 = 456;
                expect(state.value1).toBe(456);
            }, []);

            return <Fragment>
                <Text>{state.value1}</Text>
                <Text>{state.value2}</Text>
            </Fragment>
        }
        renderer.create(<TestEl/>);

        const promise = new Promise((resolve) =>{
            setTimeout(resolve, 1000);
        });
        await promise;
    });
});