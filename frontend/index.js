import { registerRootComponent } from 'expo';
import App from './src/App';

// registerRootComponent calls AppRegistry.registerComponent('main', () => App);
// It also ensures that whether you load the app in Expo Go or on the web,
// the environment is set up appropriately.
registerRootComponent(App);
