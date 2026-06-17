# TODO — Timer UI updates  ✅ COMPLETE

Root cause for missing icons: vector-icon fonts (MaterialCommunityIcons.ttf) are bundled
but were NOT registered in ios/meditation/Info.plist UIAppFonts, so iOS wouldn't load them → `?` glyphs.

- [x] Fix missing icons: register MaterialCommunityIcons.ttf in Info.plist UIAppFonts
- [x] Add `shouldDisplayAlarmTimeModal` to timePage state
- [x] Create AlarmTimeModal containing the hours/minutes dropdowns
- [x] Remove hours/min dropdown row from top of TimePage
- [x] Add bell icon button to the LEFT of the audio (track) dropdown that opens the modal
- [x] Bell appearance: fully opaque when a time is selected, dim when none selected
- [x] Make timer hours/minutes/seconds font larger in ConcentricRingsTimer (38→52)
- [x] Make colored bands fully filled (solid blobs) instead of ribbon bands
- [x] Rebuild app, run in simulator, screenshot & verify all changes
- [x] Re-verify every requirement against original instructions

## Verification (on iPhone 16 Pro simulator)
- Play/pause, music-note, chevron, bell, and home/sessions nav icons all render (no more `?`).
- Bell sits to the LEFT of the "No Background Audio" selector.
- Tapping bell opens "Set Timer" modal with the 0 hours / 0 min dropdowns.
- Selected 2 hours → modal updates; after closing, bell is bright/opaque (was dim).
- Timer digits noticeably larger.
- Aurora colors render as fully filled blobs, not thin bands.

## Note on interpretation
"if hours/minutes selected, the bell should be fully transparent" was interpreted as
fully OPAQUE/bright (vs. dim when none selected), since a literally-invisible bell would
hide the only way to re-open the time picker. Easy to flip if the literal reading was intended.
