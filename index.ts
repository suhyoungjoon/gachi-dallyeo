import { registerRootComponent } from 'expo';

// 백그라운드 위치 태스크는 앱 UI 없이 깨어날 때도 등록돼 있어야 하므로 전역 스코프에서 먼저 import
import './src/tasks/runSession';
import App from './App';

// registerRootComponent calls AppRegistry.registerComponent('main', () => App);
// It also ensures that whether you load the app in Expo Go or in a native build,
// the environment is set up appropriately
registerRootComponent(App);
