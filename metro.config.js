const { getSentryExpoConfig } = require("@sentry/react-native/metro");
const { withNativeWind } = require('nativewind/metro');

// Sentry's wrapper of Expo's default Metro config: adds the Debug ID + source map
// handling required to symbolicate release stack traces.
const config = getSentryExpoConfig(__dirname)

module.exports = withNativeWind(config, { input: './global.css' })
