#!/bin/sh
# Builds InillucentFFI.xcframework, the inillucent C library for the iPhone and the iOS simulator,
# from an inillucent checkout, and puts it in modules/react-native-inillucent/ios/ for `pod install`.
#
#   sh scripts/build-inillucent-ios.sh
#
# Needs a Mac with Xcode, and Rust. INILLUCENT_DIR names the inillucent checkout (default
# ../inillucent). The checkout should be at the commit in modules/react-native-inillucent/INILLUCENT_COMMIT,
# which is the commit the Android library in the same folder was built from; the script warns when
# it is not. The .github/workflows/ios.yml job checks out exactly that commit.

set -e

APP=$(cd "$(dirname "$0")/.." && pwd)
INILLUCENT_DIR="${INILLUCENT_DIR:-$APP/../inillucent}"
MODULE="$APP/modules/react-native-inillucent"

want=$(tr -d '[:space:]' < "$MODULE/INILLUCENT_COMMIT")
have=$(git -C "$INILLUCENT_DIR" rev-parse HEAD)
if [ "$want" != "$have" ]; then
  echo "warning: $INILLUCENT_DIR is at $have, but INILLUCENT_COMMIT says $want" >&2
fi

INILLUCENT_APPLE_PLATFORMS="ios simulator" sh "$INILLUCENT_DIR/packages/swift/build-xcframework.sh"
rm -rf "$MODULE/ios/InillucentFFI.xcframework"
cp -R "$INILLUCENT_DIR/packages/swift/InillucentFFI.xcframework" "$MODULE/ios/"
echo "copied InillucentFFI.xcframework into $MODULE/ios/"
