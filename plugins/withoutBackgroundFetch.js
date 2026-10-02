const { withInfoPlist } = require('expo/config-plugins');

// expo-task-manager는 설치만 해도 UIBackgroundModes에 'fetch'를 자동 추가한다.
// 이 앱은 백그라운드 fetch를 쓰지 않으므로(위치 모드만 사용) 심사에서 미사용 모드로 지적받지 않게 제거한다.
module.exports = function withoutBackgroundFetch(config) {
  return withInfoPlist(config, (config) => {
    const modes = config.modResults.UIBackgroundModes;
    if (Array.isArray(modes)) {
      config.modResults.UIBackgroundModes = modes.filter((m) => m !== 'fetch');
    }
    return config;
  });
};
