import "jest";
import { createObserverProxy} from '../../services/EventBus';
import app from "../../../App";

interface IAddress {
    street1: string;
    street2?: string;
    cityAndState: ICityAndState,
}

interface ICityAndState {
    city: string,
    state: string,
}

interface IPerson {
    firstName: string;
    lastName: string;
    age: number;
    address: IAddress;
}

interface IEmployee{
    name: string;
}

interface INullableProperties{
    prop1?: string;
    nested?: {
        propA?: number,
    }
}

class AppEventBus{
    addressUpdated: IAddress = {} as IAddress;
}

describe("Observer Proxy", () => {

    it('should work as an app event bus', ()=>{
        const appEventBus = createObserverProxy(new AppEventBus());
        let count = 0;
        appEventBus.addressUpdated().on(data => {
            ++count;
            expect(data.street1).toBe('hello');
        });
        appEventBus.addressUpdated().set({street1: 'hello', cityAndState: { city: 'columbus', state: 'OH'}});
    });

    it("shouldn't notify children of changes, but should keep their listeners working", ()=>{
        const person: IPerson = {firstName: "John", lastName: "Doe", age: 33, address: {street1: "Candy Ln", cityAndState: {city: 'Orange', state: 'CA'}} };
        const pPerson = createObserverProxy<IPerson>(person);

        let addressCallCount = 0;
        pPerson.address().on((a: IAddress) => {
            addressCallCount++;
        });

        pPerson().set(person);
        expect(addressCallCount).toBe(0);

        pPerson.address().set({street1: "Somewhere Court", cityAndState: {city: "Omaha", state: "NE"}});
        expect(addressCallCount).toBe(1);

        pPerson.address.cityAndState.city().set("Columbus");
        expect(addressCallCount).toBe(2);
    });

    it("should demonstrate function object working with type that has a 'name' property, which is typically readonly for Function types", ()=>{
        const employee: IEmployee = {name: "Jason"};
        const pEmployee = createObserverProxy(employee);
        expect(pEmployee.name().get()).toBe("Jason");
    });

    it("should work with nullable properties", ()=>{
        const nullable: INullableProperties = {};
        const pNullable = createObserverProxy(nullable);
        pNullable.prop1?.().on((p: string | undefined) => {});
        pNullable.nested?.propA?.().set(123);
        expect(pNullable.nested?.propA?.().get()).toBe(undefined);

        const nullable2: INullableProperties = { nested: {propA: 222}};
        const pNullable2 = createObserverProxy(nullable2);
        pNullable2.nested?.propA?.().set(444);
        expect(pNullable2.nested?.propA?.().get()).toBe(444);
        expect(nullable2?.nested?.propA).toBe(444);
    });

    it("should demonstrate type safety", ()=>{
        const person: IPerson = {firstName: "John", lastName: "Doe", age: 33, address: {street1: "Candy Lane", cityAndState: {city: 'Orange', state: 'CA'}} };
        const pPerson = createObserverProxy<IPerson>(person);

        //accessor type safety
        const getPerson: IPerson = pPerson().get();
        const getAddress: IAddress = pPerson.address().get();
        const getCityAndState: ICityAndState = pPerson.address.cityAndState().get();
        const getFirstName: string = pPerson.firstName().get();

        //mutator type safety
        pPerson.firstName().set("Jason");
        // pPerson.firstName().set(123);   Not sure how to test this causes a compilation error, but it does.
        pPerson.address.cityAndState().set({city: "SLC", state: "UT"});

        //callback type safety
        pPerson.firstName().on((f: string) => f);
        pPerson.address().on((a: IAddress) => a);
        pPerson.address.cityAndState().on((c: ICityAndState) => c);

    });

    it("should demonstrate easy event registration and deregistration", ()=>{
        const person: IPerson = {firstName: "John", lastName: "Doe", age: 33, address: {street1: "Candy Lane", cityAndState: {city: 'Orange', state: 'CA'}} };
        const pPerson = createObserverProxy<IPerson>(person);

        //register an event listener and count how many times it's called.
        let pPersonOnCallCount = 0;
        const offPerson = pPerson().on((p: IPerson)=> ++pPersonOnCallCount);

        //set some child prop and validate the parent event is fired.
        pPerson.address.street1().set("Some Court");
        expect(pPersonOnCallCount).toBe(1);

        //stop listening and verify previous callback not fired again
        offPerson();
        pPersonOnCallCount = 0;
        pPerson.address.street1().set("SomeOther Court");
        expect(pPersonOnCallCount).toBe(0);
    });

    it("should demonstrate accessing and setting property values", ()=>{
        const person: IPerson = {firstName: "John", lastName: "Doe", age: 33, address: {street1: "Candy Lane", cityAndState: {city: 'Orange', state: 'CA'}} };
        const pPerson = createObserverProxy<IPerson>(person);
        //accessors
        expect( pPerson().get() ).toBe(person);
        expect( pPerson.address().get() ).toBe(person.address);
        expect( pPerson.address.cityAndState().get() ).toBe(person.address.cityAndState);
        expect( pPerson.address.cityAndState.city().get() ).toBe(person.address.cityAndState.city);

        //mutators
        const newCityAndState: ICityAndState = {city: "SLC", state: "UT"};
        const newAddress: IAddress = {street1: "Nowhere Court", cityAndState: newCityAndState};
        const newPerson: IPerson = {firstName: "Joe", lastName: "Smith", age: 22, address: newAddress};

        //ensure that setting parent updates the children props
        pPerson().set(newPerson);
        expect( pPerson().get() ).toBe(newPerson);
        expect( pPerson.address().get() ).toBe(newAddress);
        expect( pPerson.address.cityAndState().get() ).toBe(newCityAndState);

        //check again.
        const newCityAndState2 = {city: "Phoenix", state: "AZ"};
        pPerson.address.cityAndState().set(newCityAndState2);
        expect(pPerson.address.cityAndState().get()).toBe(newCityAndState2);
        expect(pPerson().get().address.cityAndState).toBe(newCityAndState2);

        //demonstrate the underlying object is changed
        expect(newPerson.address.cityAndState).toBe(newCityAndState2);
    });

    it("should demonstrate notifying parents of changes", ()=>{
        expect(1).toBe(1);
        const person: IPerson = {firstName: "jason", lastName: "me", age: 3, address: {street1: "candy lane", cityAndState: {city: 'orange', state: 'CA'}} };
        const pPerson = createObserverProxy<IPerson>(person);

        let pPersonChangedCallCount = 0;
        pPerson().on((p: IPerson) => {
            console.log(`person changed`, p);
            ++pPersonChangedCallCount;
        });

        let addressChangedCallCount = 0;
        pPerson.address().on((add: IAddress) => {
            console.log(`address changed 1: `, add);
            ++addressChangedCallCount;
        });
        //demonstrate 2 event listeners
        let addressChangedCallCount2 = 0;
        pPerson.address().on((add: IAddress) => {
            console.log(`address changed 1: `, add);
            ++addressChangedCallCount2;
        });

        let cityAndStateChangedCallCount = 0;
        pPerson.address.cityAndState().on((cityAndState: {city: string, state: string}) => {
            console.log(`city and state changed: `, cityAndState);
            ++cityAndStateChangedCallCount;
        });

        let cityChangedCallCount = 0;
        pPerson.address.cityAndState.city().on((city: string) => {
            console.log(`city changed`, city);
            ++cityChangedCallCount;
        });

        //set a nested child value
        pPerson.address.cityAndState.city().set("Anaheim");
        //validate all the parents were called
        expect(pPersonChangedCallCount).toBe(1);
        expect(addressChangedCallCount).toBe(1);
        expect(addressChangedCallCount2).toBe(1);
        expect(cityAndStateChangedCallCount).toBe(1);
        expect(cityChangedCallCount).toBe(1);

        //set another nested
        pPerson.address.cityAndState().set({city: "SLC", state: "UT"});
        expect(pPersonChangedCallCount).toBe(2);
        expect(addressChangedCallCount).toBe(2);
        expect(addressChangedCallCount2).toBe(2);
        expect(cityAndStateChangedCallCount).toBe(2);
        expect(cityChangedCallCount).toBe(1);

        //make sure setting cityAndState didn't break city listener
        pPerson.address.cityAndState.city().set("Provo");
        expect(cityChangedCallCount).toBe(2);

    });
});
