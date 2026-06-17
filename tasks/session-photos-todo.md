# TODO: Session Photos

## Setup / deps
- [x] Add react-native-image-picker dependency
- [x] Android: CAMERA permission in AndroidManifest.xml
- [x] iOS: NSCameraUsageDescription + NSPhotoLibraryUsageDescription in Info.plist
- [x] jest.setup.js: mock react-native-image-picker; extend RNFS mock (copyFile, unlink, exists)

## Data model
- [x] IMeditationSession: add photos?: string[] + getPhotoPath() helper

## Services
- [x] fileSystem.ts: add copyFile, unlink, exists
- [x] photoService.ts (new): capturePhoto, pickPhoto, copyIntoDataDir, deletePhotos
- [x] timePage.saveSession: accept + store photos
- [x] meditationSessionRepository.deleteMeditationSession: delete copied files

## UI
- [x] PhotoThumbnailRow.tsx (new) + scss
- [x] FullScreenPhotoViewer.tsx (new) + scss
- [x] FinishSessionModal: camera + picker buttons, thumbnails, pass photos to onSaveClick, cleanup on close
- [x] TimePage.tsx: wire photos through onSaveClick
- [x] MeditationSession card: render thumbnails + open viewer

## Tests
- [x] FinishSessionModal.test.tsx: attach/save/cancel/remove/cleanup
- [x] photoService.test.ts (new)
- [x] MeditationSession.test.tsx (new/extend): thumbnails + viewer
- [x] repository test: delete removes files; legacy sessions render
- [x] Run jest, fix failures (46/47 pass; the 1 failure is pre-existing App.test Skia-mock issue, unrelated)

## Run on device
- [x] Verify phone connected (Jason's iPhone, iOS 26.0 — physical iOS device)
- [x] pod install for react-native-image-picker
- [x] Build/install on connected iPhone (BUILD SUCCEEDED, app installed)
- [x] Launch on device (successfully launched on Jason's iPhone)
- [x] Fix: full-screen viewer now uses native Modal so it fills the screen from a FlatList row
- [ ] Manual smoke: capture, attach, thumbnail, fullscreen, delete cleanup

---

# Follow-up: Media (photo + video + audio)

Generalize photos into typed media (photo/video/audio); add a "+" media button over the
notes box that opens a media picker (Take/Add Photo, Take/Add Video, Record Audio); show and
play all media on session items.

## Deps / native
- [x] Add react-native-video@6 (Fabric/new-arch video playback)
- [x] Add react-native-audio-recorder-player@4 (+ react-native-nitro-modules, SwiftAudioEx) for in-app recording + audio playback
- [x] iOS: add NSMicrophoneUsageDescription; broaden camera/photo strings to mention video
- [x] Android: add RECORD_AUDIO permission + microphone uses-feature
- [x] pod install (NitroModules 0.35.9, react-native-video 6.19.2, NitroAudioRecorderPlayer 4.5.0)
- [x] jest.setup: mock react-native-video, react-native-audio-recorder-player, gesture-handler/ReanimatedSwipeable subpath

## Data model
- [x] IMediaItem {fileName, type: photo|video|audio, legacy?}; session.media[]; keep legacy session.photos[]
- [x] MEDIA_DIR; getMediaPath/getMediaUri; getSessionMedia() folds legacy photos into media

## Services
- [x] mediaService (replaces photoService): capturePhoto/pickPhoto/captureVideo/pickVideo, saveRecordedAudio, deleteMedia
- [x] timePage.saveSession(notes, rating, media)
- [x] repository.deleteMeditationSession: delete all media via getSessionMedia + mediaService.deleteMedia

## UI
- [x] MediaThumbnailRow (replaces PhotoThumbnailRow): photo image / video+audio icon tiles, remove badge
- [x] MediaViewer (replaces FullScreenPhotoViewer): Image for photo, react-native-video w/ controls for video+audio
- [x] MediaPickerModal: native-Modal sheet w/ 5 actions + in-place audio recorder (record/stop/save/re-record)
- [x] FinishSessionModal: "+" media FAB over notes box → opens picker; manages media[]; cleanup on close
- [x] MeditationSession card: render MediaThumbnailRow + MediaViewer from getSessionMedia
- [x] Remove obsolete PhotoThumbnailRow/FullScreenPhotoViewer (+ scss)

## Tests
- [x] mediaService.test (photo/video capture+pick, audio save, delete, legacy dir)
- [x] FinishSessionModal.test rewritten for picker flow + media items
- [x] MeditationSession.test: media tiles, legacy photos, viewer open/close
- [x] repository test: deletes media + legacy photos
- [x] jest suite: 47/48 pass (1 failure = pre-existing App.test Skia LinearGradient mock, unrelated)

## Run on device
- [x] Build/install on connected iPhone (launched successfully)
- [ ] Manual smoke: take/add photo, take/add video, record audio; thumbnails; playback; delete cleanup

---

# Follow-up: UI polish + keyboard

- [x] "+" media button → paperclip icon in frosted-glass circle (dropped flat purple)
- [x] Session swipe-to-delete background → translucent muted red (rgba 214,76,76,0.28) + subtle border
- [x] Finish modal grows to fill height; notes input flexes (min 140px) for more typing room
- [x] Modal resizes above keyboard via useKeyboardHeight() hook (reliable; replaced flaky KeyboardAvoidingView)
- [x] autoFocus notes on open so keyboard is up immediately on Finish
- [x] Keyboard-dismiss button (top-right of notes, only while typing) — native InputAccessoryView ignored for multiline TextInput on iOS, so used an in-modal Keyboard.dismiss() button instead
- [x] Verified in iOS simulator (iPhone 16 Pro) via idb/screenshots: Save clears keyboard, focus-on-open, dismiss works, media picker opens
- [x] Built + launched on physical iPhone
