"ui";

let { getProjectConfig, globalLogConfig, hasUpdate } = require("./Utils.js");

globalLogConfig();

var project = getProjectConfig();

var storage = storages.create("touchren_common");
var myStorage = storages.create("touchren_mtmc");
ui.layout(
  <frame margin="15">
    <vertical id="main" visibility="visible">
      <button
        id="automationPermission"
        text="1. 授予无障碍权限"
        textSize="18sp"
      />
      <button id="consolePermission" text="2. 授予悬浮窗权限" textSize="18sp" />
      <button
        id="qiangcai"
        text="3. 开始美团买菜抢菜"
        textSize="18sp"
        textStyle="bold"
      />
      <button
        id="sign"
        text="4. 开始美团买菜签到"
        textSize="18sp"
        textStyle="bold"
      />
      <button id="checkUpdate" text="检查更新" textSize="18sp" />
      <button id="showQun" text="参数设置" textSize="18sp" />
      <text text="使用说明" textColor="red" />
      <text text="1. 运行脚本之前建议按首先点击授予权限" />
      <text text="2. 脚本运行过程中按 音量减 即可强制停止" />
      <text text="其他说明" textColor="red" />
      <text text="1. 本脚本基于Auto.JS（感谢原开发者）" />
      <text
        autoLink="web"
        text="2. 本程序完全免费，基础代码全部开源，项目地址：https://github.com/touchren/meituanmaicai"
      />
      <text id="ver" line="1" />
    </vertical>
    <vertical id="qun" visibility="gone" bg="#ffffff">
      <text text="设置解锁密码" textSize="18sp" gravity="center" />
      <input id="passwd" inputType="textPassword" />
      <text text="设置抢菜渠道" textSize="18sp" gravity="center" />
      <input id="appType" />
      <text text="默认等待时长(ms)" textSize="18sp" gravity="center" />
      <input id="commonSleepTimeInMills" />
      <text text="设置自动加购商品" textSize="18sp" gravity="center" />
      <text
        text="多个商品以|分隔, 输入关键字即可, 括号及前后的字符不要删除"
        textSize="12sp"
        gravity="left"
        color="red"
      />
      <input id="itemFilterStr" inputType="text" />

      <button
        id="hideQun"
        style="Widget.AppCompat.Button.Colored"
        text="确定"
      />
    </vertical>
  </frame>
);

ui.ver.setText("\n版本：" + project.versionName);

threads.start(checkUpdate);

ui.automationPermission.click(function () {
  threads.start(autoPerReq);
});

ui.consolePermission.click(function () {
  threads.start(conPerReq);
});

ui.sign.click(function () {
  engines.execScriptFile("./mtmc_sign.js");
});

ui.qiangcai.click(function () {
  engines.execScriptFile("./meituanmaicai.js");
});

ui.showQun.click(function () {
  let passwd = storage.get("passwd", "1234");
  log("passwd: ", passwd);
  ui.passwd.setText(passwd);

  let commonSleepTimeInMills = myStorage.get("commonSleepTimeInMills", "500");
  log("commonSleepTimeInMills: ", commonSleepTimeInMills);
  ui.commonSleepTimeInMills.setText(commonSleepTimeInMills);

  let appType = myStorage.get("appType", "0");
  log("appType: ", appType);
  ui.appType.setText(appType);

  let itemFilterStr = myStorage.get(
    "itemFilterStr",
    ".*(测试商品1|测试商品2).*"
  );
  log("itemFilterStr: ", itemFilterStr);
  ui.itemFilterStr.setText(itemFilterStr);

  ui.main.visibility = 8;
  ui.qun.visibility = 0;
});

ui.hideQun.click(function () {
  storage.put("passwd", ui.passwd.text());
  myStorage.put("itemFilterStr", ui.itemFilterStr.text());
  myStorage.put("appType", ui.appType.text());
  myStorage.put("commonSleepTimeInMills", ui.commonSleepTimeInMills.text());
  ui.qun.visibility = 8;
  ui.main.visibility = 0;
});

ui.checkUpdate.click(function () {
  threads.start(checkUpdate);
});

function autoPerReq() {
  if (!auto.service) {
    alert("找到XXXX，勾选授予权限", "部分机型在“已安装服务”中");
  }
  auto.waitFor();
  toast("无障碍权限授予成功");
}

function conPerReq() {
  toast("打开悬浮窗权限");
  toast("华为/荣耀机型注意，请手动到设置-应用-权限中开启（仅首次运行需要）");
  console.show();
  console.log("悬浮窗权限授予成功！此窗口马上消失");
  sleep(1000);
  console.hide();
}

function checkUpdate() {
  let folder = engines.myEngine().cwd() + "/";
  console.log("脚本所在路径: ", folder);
  try {
    let res = hasUpdate("/touchren/meituanmaicai", "main", "project.json");
    if (res) {
      var go = confirm(
        "有新的版本:[" + res.versionName + "]，马上更新",
        res.log
      );
      if (go) {
        if (folder.indexOf("/data/user/") == 0) {
          console.log("判断脚本为apk打包模式, 使用在线下载更新");
          engines.execScriptFile("./update_by_http.js");
        } else {
          console.log("判断脚本为源码使用模式, 使用Git更新");
          engines.execScriptFile("./update_by_git.js");
        }
        sleep(10000);
        let count = 2;
        while (!isUpdated() && count-- > 0) {
          toastLog("更新还未完成, 请稍等");
          sleep(10000);
        }
        if (isUpdated()) {
          toastLog("更新成功, 请重新运行程序");
        } else {
          toastLog("更新失败, 请稍后重试");
        }
        sleep(5000);
        engines.myEngine().forceStop();
      }
    }
  } catch (err) {
    toast("检查更新出错，请手动前往项目地址查看");
    console.error(err);
    console.error(err.stack);
    return;
  }
}

function isUpdated() {
  let newProject = getProjectConfig();
  if (newProject.versionName != project.versionName) {
    return true;
  } else {
    return false;
  }
}
