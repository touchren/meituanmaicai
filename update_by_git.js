// 常量定义
const APP_NAME = "Pocket Git";
const PROJECT_NAME = "meituanmaicai";

let { clickScale, unlock, kill_app } = require("./Utils.js");

unlock();

toastLog("结束APP:[" + APP_NAME + "]");
kill_app(APP_NAME);
sleep(2000);
toastLog("打开APP:[" + APP_NAME + "]");
launchApp(APP_NAME);
sleep(3000);
let projectBtn = text(PROJECT_NAME).findOne(2000);
if (projectBtn) {
  toastLog("进入项目:[" + PROJECT_NAME + "]");
  click(PROJECT_NAME);
  sleep(2000);
  clickScale(910, 265, "Git菜单");
  sleep(2000);
  click("Pull");
  toastLog("等待更新完成");
  sleep(10000);
  toastLog(
    "请检查通知栏, 成功的情况下会显示[Finished pulling " +
      PROJECT_NAME +
      "], 如果显示[Failed]请稍后重试"
  );
} else {
  toastLog("没有找到项目[ " + PROJECT_NAME + "], 更新失败!");
}
