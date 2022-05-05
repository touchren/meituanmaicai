let _config = {
  timeout_unlock: 1000,
  timeout_findOne: 1000,
  device_height: device.height || 2340,
  device_width: device.width || 1080,
  password: "1234",
};
function Unlocker() {
  const _km = context.getSystemService(context.KEYGUARD_SERVICE);

  this.reTry = 0;

  // 设备是否锁屏
  this.is_locked = function () {
    return _km.inKeyguardRestrictedInputMode();
  };

  // 设备是否加密
  this.is_passwd = function () {
    return _km.isKeyguardSecure();
  };

  // 解锁失败
  this.failed = function () {
    this.reTry++;
    if (this.reTry > 3) {
      engines.myEngine().forceStop();
    } else {
      let sleepMs = 5000 * this.reTry;
      sleep(sleepMs);
      this.run_unlock();
    }
  };

  // 检测是否解锁成功
  this.check_unlock = function () {
    sleep(_config.timeout_unlock);
    if (
      textContains("重新").exists() ||
      textContains("重试").exists() ||
      textContains("错误").exists()
    ) {
      console.log("密码错误");
      return false;
    }
    return !this.is_locked();
  };

  // 唤醒设备
  this.wakeup = function () {
    let limit = 3;
    while (!device.isScreenOn() && limit-- > 0) {
      device.wakeUp();
      sleep(_config.timeout_unlock);
    }
    if (!device.isScreenOn()) {
      console.warn(
        "isScreenOn判定失效，无法确认是否已亮屏。直接尝试后续解锁操作"
      );
    }
  };

  // 划开图层
  this.swipe_layer = function () {
    let x = parseInt(_config.device_width * 0.2);
    gesture(
      320,
      [x, parseInt(_config.device_height * 0.8)],
      [x, parseInt(_config.device_height * 0.3)]
    );
    sleep(_config.timeout_unlock);
  };

  // 执行解锁操作
  this.run_unlock = function () {
    // 如果已经解锁则返回
    if (!this.is_locked()) {
      console.log("已解锁");
      return true;
    }
    // 首先点亮屏幕
    this.wakeup();
    // 打开滑动层
    this.swipe_layer();
    // 如果有锁屏密码则输入密码
    if (this.is_passwd() && !this.unlock(_config.password)) {
      // 如果解锁失败
      this.failed();
    }
  };

  // 图形密码解锁
  this.unlock_pattern = function (password) {
    if (typeof password !== "string") throw new Error("密码应为字符串！");
    let lockBounds = id("com.android.systemui:id/lockPatternView")
      .findOne(_config.timeout_findOne)
      .bounds();
    let boxWidth = (lockBounds.right - lockBounds.left) / 3;
    let boxHeight = (lockBounds.bottom - lockBounds.top) / 3;
    let positions = password
      .split("")
      .map((p) => {
        let checkVal = parseInt(p) - 1;
        return { r: parseInt(checkVal / 3), c: parseInt(checkVal % 3) };
      })
      .map((p) => {
        return [
          parseInt(lockBounds.left + (0.5 + p.c) * boxWidth),
          parseInt(lockBounds.top + (0.5 + p.r) * boxHeight),
        ];
      });
    gesture(220 * positions.length, positions);
    return this.check_unlock();
  };

  // 密码解锁（仅ROOT可用）
  this.unlock_password = function (password) {
    if (typeof password !== "string") throw new Error("密码应为字符串！");
    // 直接在控件中输入密码
    setText(0, password);
    // 执行确认操作
    KeyCode("KEYCODE_ENTER");
    return this.check_unlock();
  };

  // PIN解锁
  this.unlock_pin = function (password) {
    if (typeof password !== "string") throw new Error("密码应为字符串！");
    // 模拟按键
    let button = null;
    for (let i = 0; i < password.length; i++) {
      let key_id = "com.android.systemui:id/key" + password[i];
      if ((button = id(key_id).findOne(_config.timeout_findOne)) !== null) {
        button.click();
      }
      sleep(100);
    }
    return this.check_unlock();
  };

  // 判断解锁方式并解锁
  this.unlock = function (password) {
    if (
      typeof password === "undefined" ||
      password === null ||
      password.length === 0
    ) {
      errorInfo("密码为空：" + JSON.stringify(password));
      throw new Error("密码为空！");
    }
    if (id("com.android.systemui:id/lockPatternView").exists()) {
      return this.unlock_pattern(password);
    } else if (id("com.android.systemui:id/passwordEntry").exists()) {
      return this.unlock_password(password);
    } else if (
      idMatches("com.android.systemui:id/(fixedP|p)inEntry").exists()
    ) {
      return this.unlock_pin(password);
    } else {
      console.log(
        "识别锁定方式失败，型号：" +
          device.brand +
          " " +
          device.product +
          " " +
          device.release
      );
      return this.check_unlock();
    }
  };
}

module.exports = {
  exec: function () {
    new Unlocker().run_unlock();
  },
};
