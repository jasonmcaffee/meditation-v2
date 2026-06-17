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

// Mock react-native-vector-icons (MaterialCommunityIcons used for new icon system)
jest.mock('react-native-vector-icons/MaterialCommunityIcons', () => {
  const React = require('react');
  const { Text } = require('react-native');
  const MockIcon = ({ name, size, color, testID }) =>
    React.createElement(Text, { testID: testID || 'mc-icon' }, 'icon');
  MockIcon.getImageSource = jest.fn(() => Promise.resolve({}));
  return MockIcon;
});

// Mock react-native-reanimated (use official mock to avoid Babel plugin requirement in Jest)
jest.mock('react-native-reanimated', () => {
  const mock = require('react-native-reanimated/mock');
  // Add missing hooks not in official mock
  mock.useFrameCallback = () => {};
  mock.default.useFrameCallback = () => {};
  return mock;
});

// Mock @shopify/react-native-skia
jest.mock('@shopify/react-native-skia', () => {
  const React = require('react');
  const { View } = require('react-native');
  const noop = () => {};
  const mockComp = (name) => {
    const C = ({ children, ...props }) => React.createElement(View, { testID: name }, children);
    C.displayName = name;
    return C;
  };
  return {
    Canvas: mockComp('Canvas'), Group: mockComp('Group'), Path: mockComp('Path'),
    Circle: mockComp('Circle'), Rect: mockComp('Rect'),
    RadialGradient: mockComp('RadialGradient'), BlurMask: mockComp('BlurMask'),
    BlendMode: { Screen: 'screen', Plus: 'plus', Normal: 'normal' },
    Skia: { Color: noop, Path: { MakeFromSVGString: noop, Make: () => ({ addCircle: noop, addPath: noop }) }, Paint: () => ({
      setColor: noop, setBlendMode: noop, setAntiAlias: noop, setStrokeWidth: noop,
      setStyle: noop, setMaskFilter: noop,
    })},
    vec: (x, y) => ({ x, y }),
    PaintStyle: { Fill: 'fill', Stroke: 'stroke' },
  };
});

// Mock react-native-svg (used by legacy code)
jest.mock('react-native-svg', () => {
  const React = require('react');
  const { View } = require('react-native');
  const mockComponent = (name) => {
    const Comp = ({ children, ...props }) => React.createElement(View, { testID: name }, children);
    Comp.displayName = name;
    return Comp;
  };
  return {
    __esModule: true,
    default: mockComponent('Svg'),
    Svg: mockComponent('Svg'),
    Circle: mockComponent('Circle'),
    G: mockComponent('G'),
    Path: mockComponent('Path'),
    Rect: mockComponent('Rect'),
    Text: mockComponent('SvgText'),
    Line: mockComponent('Line'),
    Polygon: mockComponent('Polygon'),
    Polyline: mockComponent('Polyline'),
    Ellipse: mockComponent('Ellipse'),
    Defs: mockComponent('Defs'),
    LinearGradient: mockComponent('LinearGradient'),
    Stop: mockComponent('Stop'),
  };
});

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
