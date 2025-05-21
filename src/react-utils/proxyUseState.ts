import {Dispatch, SetStateAction, useState} from "react";
//the return type of react's useState, which is an array of current value and a function to set the value.
type UseStateReturnType<TValue> = [TValue, Dispatch<SetStateAction<TValue>>];

export function pageState<TPageState extends object>(pageState: TPageState){
    type PropertyKeyToUseStateReturnTypeMap = {
        [TKey in keyof TPageState] : UseStateReturnType<TPageState[keyof TPageState]>
    }
    //build up a map of property key to useState(value) so we can call get value and set value during our set and get in proxy.
    //@ts-ignore
    const propertyKeyToUseStateReturnTypeMap: PropertyKeyToUseStateReturnTypeMap = {};
    Object.entries(pageState).forEach(([key, value]) => {
        //@ts-ignore
        propertyKeyToUseStateReturnTypeMap[key] = useState(value)
    });

    const handler = {
        set(obj: TPageState, key: keyof TPageState, value: TPageState[keyof TPageState]) {
            // console.log(`setting key: ${key.toString()} = ${value} on object: `, obj);
            obj[key] = value;
            const setValue = propertyKeyToUseStateReturnTypeMap[key][1];
            setValue(value);
            return true;
        },
        get(obj: TPageState, key: keyof TPageState){
            //@ts-ignore
            // console.log(`getting prop ${key} with value: ${obj[key]} object: `, obj);
            const value = propertyKeyToUseStateReturnTypeMap[key][0];
            return value;
        }
    };
    //@ts-ignore
    const proxy = new Proxy(pageState, handler);
    return proxy;
}
