// Mock react-native-fs (RNFS)
jest.mock('react-native-fs', () => ({
  DocumentDirectoryPath: '/mock/docs',
  writeFile: jest.fn(() => Promise.resolve()),
  readFile: jest.fn(() => Promise.resolve(JSON.stringify({ meditationSessions: [] }))),
  mkdir: jest.fn(() => Promise.resolve()),
  stat: jest.fn(() => Promise.resolve({ size: 0 })),
  exists: jest.fn(() => Promise.resolve(false)),
  unlink: jest.fn(() => Promise.resolve()),
}));

// Mock react-native-sound
jest.mock('react-native-sound', () => {
  const Sound = jest.fn().mockImplementation(() => ({
    play: jest.fn(),
    pause: jest.fn(),
    stop: jest.fn(),
    release: jest.fn(),
    setVolume: jest.fn(),
  }));
  Sound.setCategory = jest.fn();
  Sound.MAIN_BUNDLE = 'MAIN_BUNDLE';
  return Sound;
});

// Mock react-native-track-player
jest.mock('react-native-track-player', () => ({
  default: {
    setupPlayer: jest.fn(() => Promise.resolve()),
    add: jest.fn(() => Promise.resolve()),
    play: jest.fn(() => Promise.resolve()),
    pause: jest.fn(() => Promise.resolve()),
    stop: jest.fn(() => Promise.resolve()),
    reset: jest.fn(() => Promise.resolve()),
    addEventListener: jest.fn(() => ({ remove: jest.fn() })),
    registerPlaybackService: jest.fn(),
    getState: jest.fn(() => Promise.resolve('idle')),
  },
  State: { Playing: 'playing', Paused: 'paused', Idle: 'idle' },
  Event: { PlaybackState: 'playback-state' },
  Capability: { Play: 'play', Pause: 'pause', Stop: 'stop' },
}));

// Mock react-native-haptic-feedback
jest.mock('react-native-haptic-feedback', () => ({
  trigger: jest.fn(),
}));

// Mock react-native-static-safe-area-insets
jest.mock('react-native-static-safe-area-insets', () => ({
  safeAreaInsetsBottom: 0,
  safeAreaInsetsTop: 0,
  safeAreaInsetsLeft: 0,
  safeAreaInsetsRight: 0,
}));

// Mock react-native-select-dropdown
jest.mock('react-native-select-dropdown', () => {
  const { View } = require('react-native');
  return View;
});

// Mock react-native-star-rating-widget
jest.mock('react-native-star-rating-widget', () => {
  const React = require('react');
  const { View, Text } = require('react-native');
  return ({ rating, onChange }) =>
    React.createElement(
      View,
      { testID: 'star-rating' },
      React.createElement(
        Text,
        { onPress: () => onChange && onChange(5), testID: 'star-rating-text' },
        `Rating: ${rating}`
      )
    );
});

// Mock @fortawesome/react-native-fontawesome
jest.mock('@fortawesome/react-native-fontawesome', () => ({
  FontAwesomeIcon: ({ size }) => {
    const React = require('react');
    const { Text } = require('react-native');
    return React.createElement(Text, { testID: 'fa-icon' }, 'icon');
  },
}));

// Mock react-native-gesture-handler
jest.mock('react-native-gesture-handler', () => {
  const { View, ScrollView, FlatList, TextInput } = require('react-native');
  return {
    Swipeable: View,
    DrawerLayout: View,
    State: {},
    ScrollView,
    TextInput,
    NativeViewGestureHandler: View,
    TapGestureHandler: View,
    FlingGestureHandler: View,
    ForceTouchGestureHandler: View,
    LongPressGestureHandler: View,
    PanGestureHandler: View,
    PinchGestureHandler: View,
    RotationGestureHandler: View,
    RawButton: View,
    BaseButton: View,
    RectButton: View,
    BorderlessButton: View,
    FlatList,
    gestureHandlerRootHOC: (Component) => Component,
    GestureHandlerRootView: View,
    Directions: {},
    createNativeWrapper: (Component) => Component,
  };
});
