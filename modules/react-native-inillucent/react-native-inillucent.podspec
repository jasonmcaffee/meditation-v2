# The iOS half of the Meditation app's inillucent bridge.
#
# InillucentFFI.xcframework is the inillucent C library as a static library for the iPhone and the
# simulator. It is a build product: scripts/build-inillucent-ios.sh builds it on a Mac from the
# inillucent commit in INILLUCENT_COMMIT, before `pod install`.

Pod::Spec.new do |s|
  s.name         = 'react-native-inillucent'
  s.version      = '0.1.0'
  s.summary      = 'A React Native bridge to the inillucent embedded database.'
  s.homepage     = 'https://github.com/jasonmcaffee/meditation-v2'
  s.license      = { :type => 'UNLICENSED' }
  s.authors      = { 'Jason McAffee' => 'jasonlmcaffee@gmail.com' }
  s.platforms    = { :ios => '15.1' }
  s.source       = { :git => 'https://github.com/jasonmcaffee/meditation-v2.git' }

  # ios/*, not ios/**, which would also take the XCFramework's own copy of the header.
  s.source_files = 'ios/*.{h,m}'
  s.private_header_files = 'ios/inillucent_driver.h'
  s.vendored_frameworks = 'ios/InillucentFFI.xcframework'
  # The Rust standard library's random numbers come from the Security framework.
  s.frameworks   = 'Security'

  s.dependency 'React-Core'
end
