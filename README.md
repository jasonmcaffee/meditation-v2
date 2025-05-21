## Jhana Meditation App
This is the open source repository for the Jhana Meditation app.

This app provides several features to assist your meditation practice, including:
- Meditation timer
- Session rating and notes so you can track your progress
- All data is stored locally on your device.
- Completely free of cost and ad free.
- Soon to have audio tracks, including guided meditations.

[App Store Link](https://apps.apple.com/us/app/jhana-meditation/id6444243938)

## Code Conventions

### Component Styling
Most styling is done via [react-native-sass-transformer](https://github.com/kristerkari/react-native-sass-transformer), which allows us to do styling in a similar way to web, and also allows us to separate our style related code from the component.

### Eventing
A [custom event bus](https://github.com/jasonmcaffee/meditation/blob/master/src/services/EventBus.ts) is used for event driven development.

The event bus creates a strongly typed proxy that intercepts property access and recursively lazy loads eventing functionality on the object and it's children.

This is useful for reactively updating the ui when state changes.

```javascript
const appEventBus = createObserverProxy({someProperty: string});
//subscribe to someProperty events
appEventBus.someProperty().on((value: string) => console.log('someProperty changed: ${value}'));
//trigger event
appEventBus.someProperty().set('hello');
```

### Page State
Often a component or page can have several pieces of state that can be tedious to setup the boiler plate for.

To help reduce the tediousness, a [custom proxy wrapper](https://github.com/jasonmcaffee/meditation/blob/master/src/react-utils/proxyUseState.ts) is used to setup useState for each property on an object.

Set on the proxied object is intercepted so that the underlying setX of useState is fired.

```javascript
const componentData = {
    countOne: 0,
    countTwo: 0
};

function MyComponent(){
    //normally we'd need to create 4 variables: countOne, setCountOne, countTwo, setCountTwo, but with pageState, we can simply do:
    const state = pageState(componentData);
    return <Div>
        <Div onClick={()=> state.countOne += 1}><Text>Increment Count 1</Text></Div>
        <Div onClick={()=> state.countTwo += 1}><Text>Increment Count 2</Text></Div>
        <Text>Count one: {state.countOne}</Text>
        <Text>Count two: {state.countTwo}</Text>
    </Div>;
}
```

## Setup
This app is written in React Native, with Typescript and SASS.

### ruby
This project requires ruby 2.7.5, which requires openssl 1.1

```shell
rbenv install 2.7.5
```

### ios
#### Install Xcode and command line tools
#### Install cocoapods
```shell
gem install securerandom -v 0.3.2
gem install activesupport -v 7.1.5.1
gem install cocoapods
```

If you run into issues with pod not being found, run bundle install from the root of the project
```shell
bundle install
```

Boost verification bug

node_modules/react-native/third-party-podspecs/boost.podspec
```
 spec.source = { :http => 'https://archives.boost.io/release/1.76.0/source/boost_1_76_0.tar.bz2',
                  :sha256 => 'f0397ba6e982c4450f27bf32a2a83292aba035b827a5623a14636ea583318c41' }
```
#### Install pods
```shell
cd ios && pod install && cd ..
```

#### Install Assets
For fonts
```shell
npx react-native-assets
```
### React Native

## Running
### Development on simulator
```shell
npm run ios
```

## Sound Files

### React Native Sound
For playing multiple sounds at once, React-Native-Sound is used.

Add sound files to iOS/Android.
- On iOS, drag and drop sound file into project in Xcode. Remember to check "Copy items if needed" option and "Add to targets".
- On Android, put sound files in {project_root}/android/app/src/main/res/raw/. Just create the folder if it doesn't exist.
- Quit Metro and run `npm run ios` again or you will get errors.


