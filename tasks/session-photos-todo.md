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
