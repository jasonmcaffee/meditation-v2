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
#### Build the inillucent library for iOS
The sessions are stored in an inillucent database (see "Storage" below). The iOS app links the
inillucent C library as `InillucentFFI.xcframework`, which is built from an inillucent checkout and
is not checked in. Do this once, and again whenever `modules/react-native-inillucent/INILLUCENT_COMMIT`
changes. It needs Rust (`rustup`) and an inillucent checkout at `../inillucent` (or set `INILLUCENT_DIR`).
```shell
sh scripts/build-inillucent-ios.sh
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
npm start -- --reset-cache
npm run ios
```

### Specify device
```shell
xcrun simctl list devices
npm run ios -- --simulator="iPhone 16 pro"
```

### Misc cleanup
```shell
watchman watch-del-all

```

## Sound Files

### React Native Sound
For playing multiple sounds at once, React-Native-Sound is used.

Add sound files to iOS/Android.
- On iOS, drag and drop sound file into project in Xcode. Remember to check "Copy items if needed" option and "Add to targets".
-- Create groups
- On Android, put sound files in {project_root}/android/app/src/main/res/raw/. Just create the folder if it doesn't exist.
- Quit Metro and run `npm run ios` again or you will get errors.

#### Issue
With the upgrade to react native 0.79.2, the import broke in the Sound class, so we have to patch it ourselves by changing
sound.js to use default 
``` 
var resolveAssetSource = require("react-native/Libraries/Image/resolveAssetSource").default;
```

The patch is in patches folder, and is applied post-install via scripts in package.json

## Storage

Sessions are stored in an inillucent database, `Documents/db/meditation.rdb` (task-2445; design in
`tasks/inillucent-storage-tdd.md`). Every version before that kept them in one JSON file,
`Documents/sessions.txt`.

### What happens on the first launch of the inillucent version
1. A copy of `sessions.txt` is written to `Documents/legacy-backup/sessions-<hash>.json` and checked by hash.
2. Every session is inserted in one transaction, read back and compared with the file field for field.
   Any difference rolls the whole thing back, and the app keeps using `sessions.txt` for that launch.
3. Fields the columns do not hold are kept in `extra_json`, and records that are not sessions at all
   are kept in the `legacy_quarantine` table with their original text. Nothing is dropped.
4. After the commit, `sessions.txt` is removed from `Documents`; its checked copy stays in `legacy-backup`.

A crash at any point is safe: the conversion runs again on the next launch and skips sessions
already stored. `Documents/storage-report.json` says what the last launch did.

### The Data screen
The database button at the top of the Sessions page opens it. It shows where the sessions are, the
conversion result and the backup files, and can retry the conversion, re-import a backup, share the
original file, export every session as JSON, and switch to `sessions.txt` and back.

### The bridge
`modules/react-native-inillucent` is a local React Native module (autolinked through
`react-native.config.js`): `InillucentModule.kt` over the inillucent Android library, and
`InillucentModule.m` over the C library on iOS. The JavaScript side is
`src/services/storage/inillucentDb.ts`.

- Android: the library is checked in as a local Maven repository under
  `modules/react-native-inillucent/android/libs/maven`. Update it with
  `node scripts/update-inillucent-android.mjs` (needs the Android NDK and Rust, see inillucent's
  `packages/android/README.md`).
- iOS: `sh scripts/build-inillucent-ios.sh`, above.

### Tests
- `npm test`: `src/tests/storage/inillucentStorage.test.ts` runs the conversion, the repository and
  the Data screen actions against the real engine (the `inillucent` npm package's C library, loaded
  into Node).
- Android: build a debug APK with the JavaScript bundled in, so no Metro is needed, then seed a
  legacy file and check the conversion, then run the Maestro flows:
  ```shell
  android/gradlew -p android assembleDebug -I scripts/bundle-js-in-debug.gradle
  adb install -r android/app/build/outputs/apk/debug/app-debug.apk
  node scripts/device-test-android.mjs --serial emulator-5554
  maestro test e2e/maestro/convertedSessions.yaml e2e/maestro/sessionSurvivesRestart.yaml
  ```
- iOS: `.github/workflows/ios.yml` does the same on a GitHub macOS runner with an iOS simulator.
