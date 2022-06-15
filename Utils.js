// 点击按钮之后的通用等待时间
const COMMON_SLEEP_TIME_IN_MILLS = 500;

// 对于部分只能通过坐标点击的对象, 按照(1080, 2220)进行适配
const DEFAULT_DEVICE_WIDTH = 1080;
const DEFAULT_DEVICE_HEIGHT = 2220;

// 是否在录屏中
var isRecording = false;

// 通用方法1: 结束程序
function kill_app(packageName) {
  var name = getPackageName(packageName);
  if (!name) {
    if (getAppName(packageName)) {
      name = packageName;
    } else {
      return false;
    }
  }
  log("即将停止的APP: ", name);
  app.openAppSetting(name);
  commonWait();
  text(app.getAppName(name)).findOne(2000);
  sleep(300);
  let is_sure = textMatches(/(.*强.*|.*停.*|.*结.*|.*行.*|.*FORCE.*)/).findOne(
    3000
  );
  // log(is_sure);
  if (is_sure.enabled()) {
    log("找到停止按钮: ", is_sure.text());
    commonWait();
    is_sure.click();
    commonWait();

    buttons = textMatches(
      /(.*强.*|.*停.*|.*结.*|.*行.*|确定|是|.*FORCE.*)/
    ).find();
    if (buttons.length > 0) {
      log("找到确认停止按钮: ", buttons[buttons.length - 1].text());
      commonWait();
      buttons[buttons.length - 1].click();
      commonWait();
    } else {
      // 异常情况
      toast(app.getAppName(name) + "应用没有找到确认按钮");
      sleep(30 * 1000);
    }

    log(app.getAppName(name) + "应用已被关闭");
    sleep(1000);
    log("执行[返回]");
    back();
    commonWait();
  } else {
    log(app.getAppName(name) + "应用不能被正常关闭或不在后台运行");
    sleep(3000);
    // back();
  }
}

/**
 * 真人模拟滑动函数 （滑块滑动）
 * @param {起点x} sx
 * @param {起点y} sy
 * @param {终点x} ex
 * @param {终点y} ey
 */
function randomSwipe(sx, sy, ex, ey) {
  // 22/05/27 解决问题: [JavaException: java.lang.IllegalArgumentException: Path bounds must not be negative]
  if (sx == 0 || ex == 0) {
    console.warn("[device.width]返回结果为0,使用默认值540");
    sx = 540;
    ex = 540;
  }
  //log(sx, sy, ex, ey);
  //设置随机滑动时长范围
  var timeMin = 220;
  var timeMax = 235;
  //设置控制点极限距离
  var leaveHeightLength = 300;

  //根据偏差距离，应用不同的随机方式
  if (Math.abs(ex - sx) > Math.abs(ey - sy)) {
    var my = (sy + ey) / 2;
    var y2 = my + random(0, leaveHeightLength);
    var y3 = my - random(0, leaveHeightLength);

    var lx = (sx - ex) / 3;
    if (lx < 0) {
      lx = -lx;
    }
    var x2 = sx + lx / 2 + random(0, lx);
    var x3 = sx + lx + lx / 2 + random(0, lx);
  } else {
    var mx = (sx + ex) / 2;
    var x2 = mx + random(0, leaveHeightLength);
    var x3 = mx - random(0, leaveHeightLength);

    var ly = (sy - ey) / 3;
    if (ly < 0) {
      ly = -ly;
    }
    var y2 = sy + ly / 2 + random(0, ly);
    var y3 = sy + ly + ly / 2 + random(0, ly);
  }

  //获取运行轨迹，及参数
  var time = [0, random(timeMin, timeMax)];
  var track = bezierCreate(sx, sy, x2, y2, x3, y3, ex, ey);

  //滑动
  //log(time.concat(track));
  gestures(time.concat(track));
}
/**
 * 计算滑动轨迹
 */
function bezierCreate(x1, y1, x2, y2, x3, y3, x4, y4) {
  //构建参数
  var h = 100;
  var cp = [
    { x: x1, y: y1 + h },
    { x: x2, y: y2 + h },
    { x: x3, y: y3 + h },
    { x: x4, y: y4 + h },
  ];
  var numberOfPoints = 100;
  var curve = [];
  var dt = 1.0 / (numberOfPoints - 1);

  //计算轨迹
  for (var i = 0; i < numberOfPoints; i++) {
    var ax, bx, cx;
    var ay, by, cy;
    var tSquared, tCubed;
    var result_x, result_y;

    cx = 3.0 * (cp[1].x - cp[0].x);
    bx = 3.0 * (cp[2].x - cp[1].x) - cx;
    ax = cp[3].x - cp[0].x - cx - bx;
    cy = 3.0 * (cp[1].y - cp[0].y);
    by = 3.0 * (cp[2].y - cp[1].y) - cy;
    ay = cp[3].y - cp[0].y - cy - by;

    var t = dt * i;
    tSquared = t * t;
    tCubed = tSquared * t;
    result_x = ax * tCubed + bx * tSquared + cx * t + cp[0].x;
    result_y = ay * tCubed + by * tSquared + cy * t + cp[0].y;
    curve[i] = {
      x: result_x,
      y: result_y,
    };
  }

  //轨迹转路数组
  var array = [];
  for (var i = 0; i < curve.length; i++) {
    try {
      var j = i < 100 ? i : 199 - i;
      xx = parseInt(curve[j].x);
      yy = parseInt(Math.abs(100 - curve[j].y));
    } catch (e) {
      break;
    }
    array.push([xx, yy]);
  }

  return array;
}

// 判断当前是否高峰期
// 开售前1分钟 - 开售后5分钟
// checkTime 判断时间, 08:00
// beforeOffset 往前判断阈值, 单位: 毫秒, 比如: 1 * 60 *1000
// afterOffset 往后判断阈值, 单位: 分钟, 比如: 5 * 60 *1000
// 最终判断 >= 07:59 && <= 08:05:00
function isPeakTimeStr(checkTime, beforeOffset, afterOffset) {
  // log(
  //   "判断时间: %s, 往前%s分钟, 往后%s分钟",
  //   checkTime,
  //   beforeOffset,
  //   afterOffset
  // );
  let now = new Date();
  let checkDate = new Date(now);
  var beginIndex = checkTime.lastIndexOf(":");
  var beginHour = checkTime.substring(0, beginIndex);
  var beginMinue = checkTime.substring(beginIndex + 1, checkTime.length);
  checkDate.setHours(beginHour, beginMinue, 0, 0);
  return (
    now.getTime() >= checkDate.getTime() - beforeOffset &&
    now.getTime() <= checkDate.getTime() + afterOffset
  );
}

// 开始录屏
function startRecord() {
  if (!isRecording) {
    swipe(700, 0, 750, 1300, 200);
    commonWait();
    // 录屏工具,关闭。,按钮
    // 每个手机不一样, 需要进行适配
    // Note20U [898, 269, 221, 121] [录屏工具,已关闭。,按钮]
    let startRecBtn = descMatches("录.*关闭.*").findOne(2000);
    if (startRecBtn) {
      log("找到[开启录屏]按钮: ", startRecBtn.desc());
      startRecBtn.click();
      commonWait();
      isRecording = true;
      sleep(3000);
    } else {
      console.warn("没有找到[开启录屏]按钮");
      printPageUIObject();
      back();
      commonWait();
    }

    let confirmRecord = text("开始录制").findOne(500);
    if (confirmRecord) {
      confirmRecord.click();
      commonWait();
      sleep(5000);
    }
  } else {
    // log("已经在录屏中或者不需要录屏");
  }
}

// 开始录屏
function stopRecord() {
  if (isRecording) {
    swipe(700, 0, 750, 1300, 200);
    commonWait();
    // Note20U 录屏工具,已开启。,按钮
    // Note9 录屏工具,关闭。,按钮
    // S8 录制屏幕,开启。,按钮
    let startRecBtn = descMatches(
      "(录屏工具,已开启|录屏工具,关闭|录制屏幕,开启).*"
    ).findOne(3000);
    if (startRecBtn) {
      log("找到[关闭录屏]按钮: ", startRecBtn.desc());
      if (startRecBtn.desc().indexOf("录屏工具") != -1) {
        // Note9/Note20U
        startRecBtn.click();
        back();
        commonWait();
      } else {
        // S8 录屏过程通知栏会有一条[录制屏幕]常驻通知
        click("点击此处停止录屏");
        sleep(5000);
        back();
        commonWait();
      }
      isRecording = false;
      //printPageUIObject();
    } else {
      log("没有找到[关闭录屏]按钮, 非Note9,S8,Note20u需要自己适配");
      printPageUIObject();
      back();
      commonWait();
      // printPageUIObject();
    }
    sleep(1000);
  } else {
    log("不在录屏中");
  }
}

function printPageUIObject() {
  textMatches(".+")
    .find()
    .forEach((child, idx) => {
      if (idx < 50)
        log("第" + (idx + 1) + "项(" + child.depth() + ")text:" + child.text());
    });
  descMatches(".+")
    .find()
    .forEach((child, idx) => {
      if (idx < 50)
        log("第" + (idx + 1) + "项(" + child.depth() + ")desc:" + child.desc());
    });
  idMatches(".+")
    .find()
    .forEach((child, idx) => {
      if (idx < 50)
        log("第" + (idx + 1) + "项(" + child.depth() + ")id:" + child.id());
    });
}

// 针对Android 12 偶尔会返回0的情况
function getWidth() {
  return device.width == 0 ? 1080 : device.width;
}

// 针对Android 12 偶尔会返回0的情况
function getHeight() {
  return device.height == 0 ? 2316 : device.height;
}

function commonWait() {
  sleep(COMMON_SLEEP_TIME_IN_MILLS + random(0, 50));
}

// 点击指定对象的坐标
function clickByCoor(obj) {
  clickByCoorNoWait(obj);
  commonWait();
}

function clickByCoorNoWait(obj) {
  let loc = obj.bounds();
  log(
    "通过坐标点击[%s]:(" + loc.centerX() + "," + loc.centerY() + ")",
    obj.text() != "" ? obj.text() : obj.className() + "(" + obj.depth() + ")"
  );
  press(loc.centerX(), loc.centerY(), 20);
}

function musicNotify(name) {
  if (name == null) {
    name = "success";
  }
  let m = "/storage/emulated/0/Download/" + name + ".mp3";
  if (name == "05.need_manual") {
    device.vibrate(500);
  }
  console.time("music[" + name + "] 耗时");
  try {
    if (!files.exists(m)) {
      // 如果无法访问, 大概耗时2.5s, 将来准备换成公网地址
      // http://192.168.6.16/apk/autojs/tts/Download/
      var res = http.get(
        "https://raw.fastgit.org/touchren/meituanmaicai/main/tts/Download/" +
          name +
          ".mp3"
      );
      if (res.statusCode == 200) {
        files.writeBytes(m, res.body.bytes());
        log("%s下载完成", m);
      }
    }
    media.playMusic(m);
  } catch (e) {
    console.error("播放文件不存在:" + m, e);
  }
  console.timeEnd("music[" + name + "] 耗时");
}

function waitCheckLog() {
  sleep(3000);
}

// 关闭闹钟提醒
function closeClock() {
  // 三星Note9闹钟关闭按钮
  let closeClockBtn = id(
    "com.sec.android.app.clockpackage:id/tabCircle"
  ).findOne(200);
  if (closeClockBtn) {
    console.info("识别到三星闹钟界面, 执行[返回]关闭闹钟");
    log("执行返回15");
    back();
    sleep(500);
  } else {
    // 可能是弹窗状态, 5分钟后会自动消失
    log("没有识别出闹钟按钮");
  }
}

// 解锁屏幕
function unlock() {
  try {
    require("./Unlock.js").exec();
  } catch (e) {
    console.error(e);
  }
}

function lock() {
  try {
    // 锁屏 Android9 以上支持
    auto.service.performGlobalAction(8);
  } catch (e) {
    console.error(e);
  }
}

function scrollUp() {
  randomSwipe(
    getWidth() / 2,
    random(300, 400),
    getWidth() / 2,
    random(1500, 1600)
  );
}

function scrollDown() {
  randomSwipe(
    getWidth() / 2,
    random(1500, 1600),
    getWidth() / 2,
    random(300, 400)
  );
}

// 针对人工抓取的坐标, 不同分辨率需要进行坐标等比例缩放
// 根据横坐标计算缩放比例
function clickScale(x, y, btnTxt) {
  let ratio = getWidth() / DEFAULT_DEVICE_WIDTH;
  let realX = x * ratio;
  let realY = y * ratio;
  log("点击[固定]坐标[%s]:(" + realX + "," + realY + ")", btnTxt);
  click(realX, realY);
}

// 部分元素是靠底部排版的, 所以对于x是1080,但是y有细微差异的屏幕, 需要计算偏移量
function clickBottomScale(x, y, btnTxt) {
  let ratio = getWidth() / DEFAULT_DEVICE_WIDTH;
  let realX = x * ratio;
  let realY = y * ratio + getHeight() - DEFAULT_DEVICE_HEIGHT * ratio;
  log("点击[固定]坐标[%s]:(" + realX + "," + realY + ")", btnTxt);
  click(realX, realY);
}

// 返回 project.json 解析的对象
function getProjectConfig(path) {
  !path && (path = "./project.json");
  if (files.exists(path)) {
    log("找到本地配置文件:[%s]", path);
    let jsonStr = files.read(path);
    //log(jsonStr);
    let project = JSON.parse(jsonStr);
    log("版本号: ", project.versionName);
    return project;
  } else {
    return new Object();
  }
}

function globalLogConfig() {
  let now = new Date();
  var month = now.getMonth() + 1;
  month = month < 10 ? "0" + month : month;
  console.setGlobalLogConfig({
    file:
      "/storage/emulated/0/脚本/logs/console-" +
      (now.getYear() - 100) +
      "_" +
      month +
      "_" +
      now.getDate() +
      ".log",
  });
}

function downloadFromGithub(repo, branch, file) {
  log("尝试下载文件", repo, branch, file);
  let CONTEXT_URLS = [
    "https://ghproxy.futils.com/https://github.com" +
      repo +
      "/blob/" +
      branch +
      "/",
    "https://gh.api.99988866.xyz/https://raw.githubusercontent.com" +
      repo +
      "/" +
      branch +
      "/",
    "https://cdn.staticaly.com/gh" + repo + "/" + branch + "/",
    //"https://raw.xn--gzu630h.xn--kpry57d"+repo+"/"+branch+"/",
    "https://raw.githubusercontents.com" + repo + "/" + branch + "/",
    //"https://gcore.jsdelivr.net/gh"+repo+"@"+branch+"/",
    "https://fastly.jsdelivr.net/gh" + repo + "@" + branch + "/",
    "https://ghproxy.com/https://raw.githubusercontent.com" +
      repo +
      "/" +
      branch +
      "/",
    "https://raw.iqiq.io" + repo + "/" + branch + "/",
    //"https://raw.githubusercontent.com"+repo+"/"+branch+"/",
  ];
  let downloadSuccess = false;
  var body = {};
  CONTEXT_URLS.forEach((context_url, i) => {
    if (!downloadSuccess) {
      let url = context_url + file;
      console.time("脚本[" + url + "]第" + (i + 1) + "次更新: 耗时");
      try {
        res_script = http.get(url, {
          headers: {
            "Accept-Language": "en-us,en;q=0.5",
            "User-Agent":
              "Mozilla/5.0(Macintosh;IntelMacOSX10_7_0)AppleWebKit/535.11(KHTML,likeGecko)Chrome/17.0.963.56Safari/535.11",
          },
        });
        if (res_script.statusCode == 200) {
          downloadSuccess = true;
          body = res_script.body;
        } else {
          toastLog(
            "脚本获取失败！建议您检查网络后再重新运行软件吧\nHTTP状态码:" +
              res_script.statusMessage
          );
        }
      } catch (e) {
        log("下载远程脚本异常: ", e);
        log(e.stack);
      }
      console.timeEnd("脚本[" + url + "]第" + (i + 1) + "次更新: 耗时");
    }
  });
  return body;
}

function updateByGit(projectName) {
  const APP_NAME = "Pocket Git";
  log("结束APP[" + APP_NAME + "]");
  kill_app(APP_NAME);
  toastLog("打开APP[" + APP_NAME + "]");
  launchApp(APP_NAME);
  sleep(3000);
  let projectBtn = text(projectName).findOne(2000);
  if (projectBtn) {
    toastLog("进入项目[" + projectName + "]");
    click(projectName);
    sleep(1000);
    let sign = desc("Remotes…").findOne(1000);
    if (sign) {
      sign.click();
    } else {
      clickScale(910, 265, "Git菜单");
    }
    sleep(1000);
    click("Pull");
    toastLog("等待更新完成");
    sleep(5000);
    toastLog(
      "请检查通知栏, 成功的情况下会显示[Finished pulling " +
        projectName +
        "], 如果显示[Failed]请稍后重试"
    );
    sleep(3000);
    // 返回首页
    back();
    sleep(1000);
    // 返回之前程序
    back();
    sleep(1000);
  } else {
    toastLog("没有找到项目[ " + projectName + "], 更新失败!");
  }
}

function updateByHttp() {
  let project = getProjectConfig();
  log("project.assets", project.assets);
  if (project.assets) {
    let folder = engines.myEngine().cwd() + "/";
    log("开始获取远程脚本, 保存路径: ", folder);
    project.assets.forEach((file, index) => {
      let body = downloadFromGithub(REPO, BRANCH, file);
      if (body) {
        let updateFile = folder + file;
        log("保存文件路径:", updateFile);
        files.writeBytes(updateFile, body.bytes());
        toastLog("脚本" + file + "更新成功");
      } else {
        toastLog("脚本" + file + "更新失败, 请稍后重试");
        exit();
      }
    });
    toastLog("全部脚本(" + project.assets.length + "个)更新完成");
  } else {
    toastLog("无法获取配置文件, 更新失败");
  }
}

function hasUpdate(repo, branch, configFile) {
  !configFile && (configFile = "project.json");
  toastLog("正在检查更新");
  let project = getProjectConfig("./project.json");
  if (project.versionName) {
    try {
      let body = downloadFromGithub(repo, branch, configFile);
      let remoteProject = body.json();
      if (remoteProject.versionName != project.versionName) {
        toastLog(
          "最新版本为:" +
            remoteProject.versionName +
            ", 更新内容: " +
            remoteProject.log
        );
        return remoteProject;
      } else {
        toastLog("当前为最新版");
      }
    } catch (err) {
      toastLog("检查更新出错，请手动前往项目地址查看");
      console.error(err);
      console.error(err.stack);
      return;
    }
  } else {
    console.log("无法获取当前版本号, 跳过更新检查");
  }
  return;
}

exports.kill_app = kill_app;
exports.randomSwipe = randomSwipe;
exports.isPeakTimeStr = isPeakTimeStr;
exports.startRecord = startRecord;
exports.stopRecord = stopRecord;
exports.printPageUIObject = printPageUIObject;
exports.getWidth = getWidth;
exports.getHeight = getHeight;
exports.commonWait = commonWait;
exports.clickByCoor = clickByCoor;
exports.clickByCoorNoWait = clickByCoorNoWait;
exports.musicNotify = musicNotify;
exports.waitCheckLog = waitCheckLog;
exports.closeClock = closeClock;
exports.unlock = unlock;
exports.clickScale = clickScale;
exports.scrollUp = scrollUp;
exports.scrollDown = scrollDown;
exports.clickScale = clickScale;
exports.clickBottomScale = clickBottomScale;
exports.getProjectConfig = getProjectConfig;
exports.globalLogConfig = globalLogConfig;
exports.downloadFromGithub = downloadFromGithub;
exports.updateByGit = updateByGit;
exports.updateByHttp = updateByHttp;
exports.hasUpdate = hasUpdate;
