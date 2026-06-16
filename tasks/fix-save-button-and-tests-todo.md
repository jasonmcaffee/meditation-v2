# TODO: Fix Save Button, Text Alignment & Add Tests

## Bugs to Fix
- [x] Fix Modal.tsx inner window Div - add onClick={() => {}} to stop backdrop propagation
- [x] Fix timePage.ts saveSession - add shouldDisplayFinishSessionModal = false after save
- [x] Fix finish-session-modal.scss notesTextInput - add textAlignVertical: 'top'

## Test Infrastructure
- [x] Install @testing-library/react-native
- [x] Update jest.config.js - add moduleNameMapper for SCSS, setup files, transform ignores
- [x] Create jest.setup.js with native module mocks
- [x] Create __mocks__ for react-native-fs, react-native-sound, react-native-track-player, react-native-vector-icons, react-native-star-rating-widget, react-native-gesture-handler, react-native-static-safe-area-insets

## Tests to Write
- [x] __tests__/FinishSessionModal.test.tsx - renders modal, edits notes, saves with correct args, close button works
- [x] __tests__/MeditationSessionsPage.test.tsx - shows sessions list, updates on save event, session data is displayed

## Verification
- [x] Run tests and verify they pass - 25/25 tests passing across 5 test suites
