export default function createUnregisterFunction(...unregisterFunctions: ( ()=> void )[]){
    return () => {
        unregisterFunctions.forEach(f => f());
    }
}