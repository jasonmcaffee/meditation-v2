//The property type
//e.g. address.street1 would be "string".  person.address would be IAddress
type PropertyType<T> = T[keyof T];

//https://www.typescriptlang.org/docs/handbook/advanced-types.html#index-types
//https://spin.atomicobject.com/2018/05/14/type-safe-object-merging-2-8/  <-- T extends undefined ? never : T  might be the answer to nullable properties
/**
 * interface exposed to the outside world, which is a facade (simple & reduces api) for IPropertyOfTAsAnEventBus.  These are the functions users can call after executing the function object.  e.g. pPerson.address().on(...);  pPerson().get();  pPerson.address.street1().set(...);
 * TKey extends keyof T is the magic sauce that ensures type safety on the set.
 * An event bus holds the callbacks for all the properties of T.  so IPropertyOfTAsAnEventBusFacade<I
 */
export interface IPropertyOfTAsAnEventBusFacade<T, TKey extends keyof T>{
    /**
     * Return the raw value of the object being proxied.
     */
    get: () => T[TKey];
    /**
     * Set the raw value of the object being proxied and notify event listeners
     * @param value - raw value to set the
     */
    set: (value: T[TKey]) => void;
    /**
     * Listen for whe the property is changed (e.g. set is called, or one of it's nested properties are changed)
     * @param callback
     */
    on: (callback: (p: T[TKey]) => void) => Off;
}

//the function part of the function object we use as an api.  It returns the event bus api (on, get, set).  e.g. pPerson.address() is an execution of this function.
type FunctionThatReturnsPropertyOfTAsAnEventBus<T, TKey extends keyof T> = () => IPropertyOfTAsAnEventBusFacade<T, TKey>;

//the function object type definition is an intersection of a function and an object.
// The object part is every property of T as a proxy to the property.  e.g. pPerson.address is the proxy of address.
// The function part is a function that returns any property of T as an event bus, where event bus is defined as the functions get, set, on.
export type FunctionThatReturnsPropertyOfTAsAnEventBusIntersectedWithProxyOfT<T, TKey extends keyof T> =
    FunctionThatReturnsPropertyOfTAsAnEventBus<T, TKey>
    & ProxyOfT<T[TKey]>;  //e.g. T[TKey] would be IAddress for pPerson.address

/**
 * The main type exposed to the world, returned from createProxyBus.
 * Every property of T is a function object, where the object portion is a ProxyOfT<T[TKey]> i.e. each property of T is proxy of the property type, and this continues down to every nested property in the graph.
 */
export type ProxyOfT<T> =
    { [TKey in keyof T]: FunctionThatReturnsPropertyOfTAsAnEventBusIntersectedWithProxyOfT<T, TKey> };

//unregister callback registered with .on.  For convenience, on returns off.
type Off = () => void;

//each key on T will have a callback entry. its lazily created though, so make it a partial.
type CallbackStorage<T> = {
    [TKey in keyof T]: {
        callbacks: ((newValue: PropertyType<T>) => void)[];
    }
};

//The property as an actual event bus, which registers and stores callbacks, notifies parents of changes, etc.
//The interface IPropertyOfTAsAnEventBusFacade is a Facade around this.
interface IPropertyOfTAsAnEventBus<T, TParent=unknown>{
    //name of the property. e.g. "address"
    name: string;
    //raw value of the property being proxied.
    raw: T;
    //when a nested property is updated, we want to call up to the parents and notify them of change.  e.g. pPerson.address.cityAndState.city().set("Anaheim") should trigger the callbacks for city, cityAndState, address, and person.
    parentEventedProperty?: IPropertyOfTAsAnEventBus<TParent>;
    /**
     * register a callback to be executed whenever .set() is called on a nested property.
     * @param callback - function to be called which accepts the new value that was set.
     * @param key - the name of the property changed. e.g. if T is an IAddress, it would hold the callbacks for all nested properties of IAddress, so key might be "street1"
     * @return off - a function to unregister the callback
     */
    on: (callback: (p: PropertyType<T>) => void, key: keyof T ) => Off;
    /**
     * unregisters a callback for a given key.
     * @param callback
     * @param key
     */
    off: (callback: ((value: PropertyType<T>) => void), key: keyof T) => void;
    set: (value: PropertyType<T>, keyName: keyof T, options?: Partial<ISetOptions>) => void;
    get: ( keyName: keyof T) => T[keyof T];
    notifyParentOfChange: (p: T[keyof T], keyName: keyof T) => void;
    // notifyChildrenOfChange: (p: T[keyof T], keyName: keyof T) => void;  this probably isn't a good idea.
    //we add values lazily, so make it a partial of T
    nestedPropertyProxies: Partial<{
        [TKey in keyof T]: ProxyOfT<T[keyof T]>;
    }>;
    //we add values lazily, so make it a partial of T.  TODO: if we call nestedPropertyProxies[key]().set(..., {notifyParents: false}) we can avoid needing this property.
    nestedPropertyAsEventBuses: Partial<{
        [TKey in keyof T]: IPropertyOfTAsAnEventBus<T[keyof T]>;
    }>;

    callbackStorage: CallbackStorage<T>;
}

interface ISetOptions{
    notifyParentOfChange: boolean;
}

const defaultSetOptions: ISetOptions = {notifyParentOfChange: true};
/**
 * Event bus for a given property.
 */
class PropertyOfTAsAnEventBus<T extends object, TParent=unknown> implements IPropertyOfTAsAnEventBus<T, TParent>{
    //@see IPropertyOfTAsAnEventBus
    name: string;
    raw: T;
    parentEventedProperty?: IPropertyOfTAsAnEventBus<TParent>;  //todo rename prop
    //@ts-ignore todo: make partial
    callbackStorage: CallbackStorage<T> = {};
    nestedPropertyProxies: Partial<{
        [TKey in keyof T]: ProxyOfT<T[keyof T]>;
    }> = {};
    nestedPropertyAsEventBuses: Partial<{
        [TKey in keyof T]: IPropertyOfTAsAnEventBus<T[keyof T]>;
    }> = {};
    constructor(initialRootValue: T, name="root") {
        this.name = name;
        this.raw = initialRootValue;
    }
    on(callback: (p: T[keyof T]) => void, key: keyof T) {
        this.callbackStorage[key] = this.callbackStorage[key] || {callbacks: []};
        this.callbackStorage[key].callbacks.push(callback);
        return () => this.off(callback, key);
    }
    off(callback: (p: T[keyof T]) => void, key: keyof T){
        if(!this.callbackStorage[key]){ return; }
        const index = this.callbackStorage[key].callbacks.findIndex(c => c === callback);
        if(index >= 0){
            this.callbackStorage[key].callbacks.splice(index, 1);
        }
    }
    notifyParentOfChange(p: T[keyof T] | undefined, keyName: keyof T) {
        if(this.parentEventedProperty){
            // console.warn(`notifying parent: `);
            //@ts-ignore because this.raw is a type we don't know
            this.parentEventedProperty.set(this.raw, this.name);
        }
    }
    get( keyName: keyof T): T[keyof T]{
        return this.raw[keyName];
    }
    set(value: T[keyof T], key: keyof T, options:Partial<ISetOptions> = defaultSetOptions) {
        const setOptions: ISetOptions = {...defaultSetOptions, ...options};
        const root = this.raw;
        root[key] = value;
        //set the raw of all evented props and their nested props.
        //we cache the nested properties after they are created, so all the on callbacks are always held onto.
        //HOWEVER, when the parent object is reset, we need to update the eventedProperty.raw value, since the parent could've reset it to anything.
        recursivelySetRawValueOfAllNestedProperties(this);

        if(this.callbackStorage[key]){
            this.callbackStorage[key].callbacks.forEach(c => c(value));
        }
        // console.log(`notifyCallbacksOfChange value: `, value, `key: ${key} `, `root:  `, root);
        if(setOptions.notifyParentOfChange){
            this.notifyParentOfChange(value, key);
        }
    }
}

function createPropertyOfTAsAnEventBus<T extends object, TParent=unknown>(_dontUseExceptForRaw: T, name = "root"){
    return new PropertyOfTAsAnEventBus<T, TParent>(_dontUseExceptForRaw, name);
}


export function createObserverProxy<T extends object>(root: T = {} as T){
    //make it so the root behaves as properties would.
    //e.g. createProxyBus(person)  would allow  pPerson().on(...)
    type RootContainer = {root: T};
    const rootContainer: RootContainer = {root};
    const eventedProperty = createPropertyOfTAsAnEventBus<RootContainer>(rootContainer);
    const proxiedEventedProperty = createProxyOfT(eventedProperty, rootContainer);
    return proxiedEventedProperty.root;
}

export function createProxyOfT<T extends object>(propertyOfTAsAnEventBus: IPropertyOfTAsAnEventBus<T>, rootObj: T){
    const proxy = new Proxy<ProxyOfT<T>>(rootObj as ProxyOfT<T>, {
        /**
         * Any time a property is accessed on T, this function is called.
         * We return a function object
         * @param _
         * @param key
         */
        //@ts-ignore
        get(_, key: keyof T): FunctionThatReturnsPropertyOfTAsAnEventBusIntersectedWithProxyOfT<T, keyof T>{
            function getEventBusFacade(): IPropertyOfTAsAnEventBusFacade<T, keyof T>{
                return {
                    get(){
                        // return root[key]; <-- don't do this as root can become stale if parent is set, whereas raw is always updated.
                        return propertyOfTAsAnEventBus.get(key);
                    },
                    set(value: T[keyof T]){
                        return propertyOfTAsAnEventBus.set(value, key);
                    },
                    on(callback: (p: T[keyof T]) => void){
                        return propertyOfTAsAnEventBus.on(callback, key);
                    },
                };
            }

            function getProxyOfPropertyBeingAccessed(): ProxyOfT<T[keyof T]>{ //
                // console.log(`getNested called for key: ${key} eventedProperty`, eventedProperty);
                const root = propertyOfTAsAnEventBus.raw;

                if(typeof root[key] !== "object"){ //avoid TypeError: Cannot create proxy with a non-object as target or handler
                    //@ts-ignore
                    return root[key];
                }
                //create the proxy if it doesn't already exist.
                if(!propertyOfTAsAnEventBus.nestedPropertyProxies[key]){
                    const nestedObject = root[key];
                    //@ts-ignore because T[keyof T] doesn't understand that key refers to an object
                    const nestedEventedPropertyForKey = createPropertyOfTAsAnEventBus<T[keyof T], T>(nestedObject, key);
                    nestedEventedPropertyForKey.parentEventedProperty = propertyOfTAsAnEventBus;
                    // @ts-ignore
                    propertyOfTAsAnEventBus.nestedPropertyAsEventBuses[key] = nestedEventedPropertyForKey;

                    const propertyAsRoot = root[key];
                    //@ts-ignore because T[keyof T] doesn't understand that key refers to an object
                    const nestedProxiedEventedPropertyForKey = createProxyOfT<T[keyof T]>(nestedEventedPropertyForKey, propertyAsRoot as object);
                    propertyOfTAsAnEventBus.nestedPropertyProxies[key] = nestedProxiedEventedPropertyForKey;
                }
                //@ts-ignore it doesn't match the return type for some reason.
                return propertyOfTAsAnEventBus.nestedPropertyProxies[key];
            }

            const proxyOfPropertyAccessedByKey: ProxyOfT<T[keyof T]> = getProxyOfPropertyBeingAccessed();
            //combine together to make FunkyWrapped
            //since Function.name is readonly, and T might have a 'name' property, allow name to be written so our Object.assign doesn't blow up.
            Object.defineProperty(getEventBusFacade, 'name', {
                writable: true,
            });

            //@ts-ignore
            const result: FunctionThatReturnsPropertyOfTAsAnEventBusIntersectedWithProxyOfT<T, keyof T> = Object.assign(getEventBusFacade, proxyOfPropertyAccessedByKey);
            return result;
        },
    });

    return proxy;
}

function recursivelySetRawValueOfAllNestedProperties<T extends object, TParent = unknown>(eventedProperty: PropertyOfTAsAnEventBus<T, TParent>){
    if(!eventedProperty.nestedPropertyProxies || !eventedProperty.raw){ return; }
    for(let key in eventedProperty.raw){
        const nestedEventProperty = eventedProperty.nestedPropertyAsEventBuses[key];
        if(nestedEventProperty){
            const newValue = eventedProperty.raw[key]
            // console.log(`setting nestedEventProperty: ${nestedEventProperty.name} to value: `, newValue );
            //@ts-ignore
            nestedEventProperty.raw = newValue;
            //@ts-ignore
            recursivelySetRawValueOfAllNestedProperties(nestedEventProperty);
        }
    }
}