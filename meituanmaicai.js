// 常量定义
const APP_NAME = "美团买菜";
// 最大尝试轮数
const MAX_ROUND = 10;
// 每轮最长重试次数 (平均单次1.2秒)
const MAX_TIMES_PER_ROUND = 500;
// 是否启用 结算 功能, 0:不启用, 1:启用
const ACTIVE_SUBMIT = 1;
// 点击按钮之后的通用等待时间
const COMMON_SLEEP_TIME_IN_MILLS = 200;
// 是否先强行停止APP
const ACTIVE_STOP_APP = 0;

// 第几轮
var round = 0;
// 本轮执行第几次
var count = 0;
// 选择时间本轮选择第几次
var countT = 0;
// 本轮是否成功
//var isSuccess = false;

// 调试期间临时使用, 关闭其他脚本
engines.all().map((ScriptEngine) => {
  log("engines.myEngine().toString():" + engines.myEngine().toString());
  if (engines.myEngine().toString() !== ScriptEngine.toString()) {
    ScriptEngine.forceStop();
  }
});

device.wakeUp();
commonWait();
toastLog(
  "常量配置如下 -> 启用结算:" +
    ACTIVE_SUBMIT +
    ",轮数:" +
    MAX_ROUND +
    ",每轮次数:" +
    MAX_TIMES_PER_ROUND +
    ",点击后默认等待ms:" +
    COMMON_SLEEP_TIME_IN_MILLS
);

// 开始循环执行
while (round < MAX_ROUND) {
  round++;
  log("开始第" + round + "轮抢菜");
  try {
    start();
  } catch (e) {
    toastLog("异常: 出现中断性问题");
    log(e);
  }
  let randomSleep = random(30 * 1000, 90 * 1000);
  log("第" + round + "轮抢菜执行结束, 休息[" + randomSleep + "]ms");
  // 随机休息30-90秒
  sleep(randomSleep);
}
log("程序正常结束");

/**
 * 真人模拟滑动函数 （滑块滑动）
 * @param {起点x} sx
 * @param {起点y} sy
 * @param {终点x} ex
 * @param {终点y} ey
 */
function randomSwipe(sx, sy, ex, ey) {
  //设置随机滑动时长范围
  var timeMin = 200;
  var timeMax = 500;
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

  //log("随机控制点A坐标：" + x2 + "," + y2);
  //log("随机控制点B坐标：" + x3 + "," + y3);
  //log("随机滑动时长：" + time[1]);
  //log("track" + track)

  //滑动
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

function musicNotify() {
  // 心如止水
  const m = "/storage/emulated/0/Download/success.mp3";
  media.playMusic(m);
  // sleep(media.getMusicDuration());
}

function to_mall_cart() {
  if (textStartsWith("我常买").exists()) {
    log("当前已经在购物车页面");
  } else {
    shopping_cart_btn = id("img_shopping_cart").findOne(5000);
    if (shopping_cart_btn) {
      shopping_cart_btn.parent().click(); //btn上一级控件可点击
      //var loc = id("img_shopping_cart").findOne().bounds();//1.匹配id寻找位置。
      //click(loc.centerX(), loc.centerY());
      log("已进入购物车,等待购物车加载完成");
      commonWait();
      text("删除").findOne(2000);
    } else {
      log("未找到购物车按钮，退出");
      exit;
    }
  }
}

// const to_mine = () => {
//   mine_btn = id("img_mine").findOne();
//   if (mine_btn) {
//     mine_btn.parent().click(); //btn上一级控件可点击
//     //var loc = id("img_shopping_cart").findOne().bounds();//1.匹配id寻找位置。
//     //click(loc.centerX(), loc.centerY());
//     log("已进入我的");
//   } else {
//     log("未找到我的按钮，退出");
//     exit;
//   }
// };

function reload_mall_cart() {
  // 切换标签页面
  // log("重新加载购物车");
  randomSwipe(
    460 + random(0, 100),
    300 + random(0, 100),
    500 + random(0, 100),
    800 + random(0, 100)
  );
  if (ACTIVE_SUBMIT == 1) {
    sleep(1000, random(0, 1000));
  } else {
    sleep(5000, random(0, 5000));
  }
}

function pay() {
  // 可能还会失败
  if (textStartsWith("选择送达时间").exists()) {
    log("异常: 还停留在选择送达时间页面, 开始重新选择时间");
    selectTime();
  } else if (textStartsWith("我常买").exists()) {
    log("异常: 还停留在购物车页面");
    submit_order();
  } else {
    log("准备点击[立即支付]");
    click_i_know();
    if (
      textStartsWith("立即支付").exists() &&
      !textStartsWith("我知道了").exists()
    ) {
      log("选择时间计数清零");
      countT = 0;
      textStartsWith("立即支付").findOne().parent().click();
      commonWait();
      sleep(500);
      confirm_to_pay();
    } else {
      log("TODO异常: 没有找到支付按钮, 稍后重试");
      sleep(500);
      pay();
    }
  }
  log("DEBUG: [立即支付]结束");
}

function confirm_to_pay() {
  click_i_know();
  if (textStartsWith("免密支付").exists()) {
    // TODO 220417 继续调试, 后续考虑直接支付
    toastlog("已确认支付成功, 播放音乐");
    musicNotify();
    // 15分钟内支付即可, 为了防止误操作, 1分钟之后点击付款
    sleep(60 * 1000);
    textStartsWith("免密支付").findOne().parent().click();
    commonWait();
    sleep(random(500, 1 * 1000));
    if (textStartsWith("成功").exists()) {
      // 等待2分钟
      sleep(120 * 1000);
    } else {
      log("异常: 没有支付成功, 重新支付");
      confirm_to_pay();
    }
  } else {
    log("下单失败, 马上重试");
    sleep(1500);
    pay();
  }
  log("DEBUG: [免密支付]结束");
}

function selectTime() {
  sleep(500);
  click_i_know();
  countT++;
  let shopping_cart_btn = textMatches(/(购物车)/);
  if (shopping_cart_btn.exists()) {
    submit_order();
  }
  //选择送达时间
  textStartsWith("送达时间").findOne(1000).parent().click();
  log("选择时间第" + round + "-" + cocountTunt + "次");
  if (count == 1 || count % 5 == 0) {
    toast(
      "第" +
        round +
        "-" +
        countT +
        "次点击->" +
        textStartsWith("送达时间").findOne().text()
    );
  }

  commonWait();
  sleep(500);
  var selectedTime = null;
  hourClock_unfilterd = textContains(":00").find();
  hourClock = hourClock_unfilterd.filter(
    (item) => item.clickable && item.checkable && enabled
  );
  if (hourClock.length > 0) {
    selectedTime = hourClock[0];
  } else {
    quarClock_unfilterd = textContains(":15").find();
    quarClock = quarClock_unfilterd.filter(
      (item) => item.clickable && item.checkable && enabled
    );
    if (quarClock.length > 0) {
      selectedTime = quarClock[0];
    } else {
      halfClock_unfilterd = textContains(":30").find();
      halfClock = halfClock_unfilterd.filter(
        (item) => item.clickable && item.checkable && enabled
      );
      if (halfClock.length > 0) {
        selectedTime = halfClock[0];
      } else {
        clock_last_unfilterd = textContains(":45").find();
        clock_last = clock_last_unfilterd.filter(
          (item) => item.clickable && item.checkable && enabled
        );
        if (clock_last.length > 0) {
          selectedTime = clock_last[0];
        }
      }
    }
  }

  if (selectedTime) {
    log("点击:" + selectedTime.text());
    selectedTime.parent().click();
    commonWait();
    let retry = textMatches(/(我知道了|返回购物车)/).findOne(1000);
    // 判断是否提示运力已满
    if (retry) {
      log("点击:" + retry.text());
      retry.parent().click();
      commonWait();
      let retry2 = textMatches(/(我知道了|返回购物车|送达时间)/).findOne(1000);
      if (textStartsWith("送达时间").exists()) {
        selectTime();
      } else {
        selectTime();
      }
    } else {
      sleep(100);
      if (textStartsWith("选择送达时间").exists()) {
        let closeBtn = className("android.widget.ImageView")
          .depth(15)
          .findOne(1000);
        if (closeBtn) {
          log("关闭[选择送达时间]页面");
          closeBtn.parent().click();
          commonWait();
        }
        log("异常: 开始重新选择时间");
        selectTime();
      } else {
        pay();
        // 可能还会失败
        // sleep(3000);
        // if (textStartsWith("选择送达时间").exists()) {
        //   log("异常: 支付失败, 开始重新选择时间");
        //   selectTime();
        // }
      }
    }
  } else {
    log("没有可用时间段");
    if (countT > MAX_TIMES_PER_ROUND) {
      toast("抢菜选择时间失败");
      return;
    }
    sleep(100);
    log("开始重新选择时间");
    selectTime();
  }
  log("DEBUG: [选择时间]结束");
}

function check_all() {
  log("判断购物车是否已经选中商品");
  let radio_checkall = className("android.widget.ImageView")
    .depth(22)
    .findOne();
  if (radio_checkall) {
    // log(radio_checkall.findOne());
    // 选中的情况下是 结算(数量),
    // 220422 更新, 如果闭店的情况下, 就算全选了商品, 结算后面也不会出现"(数量)""
    // let is_checked = textStartsWith("结算").findOne().text() != "结算";
    let is_checked = textMatches(/(.*配送费.*)/).findOne(300);
    log("购物车当前已选择商品:" + +(is_checked != null));
    if (is_checked == null) {
      log("全选所有商品");
      radio_checkall.parent().click();
      commonWait();
      sleep(1000);
    } else if (count == 1) {
      // 已经选择过商品的情况下, 第一次也取消并重新选择
      log("重新全选商品-点击全选按钮");
      radio_checkall.parent().click();
      commonWait();
      sleep(1000);
      is_checked = textMatches(/(.*配送费.*)/).findOne(300);
      if (is_checked == null) {
        log("重新全选商品-再次点击全选按钮");
        radio_checkall.parent().click();
        commonWait();
        sleep(1000);
      }
      is_checked = textMatches(/(.*配送费.*)/).findOne(300);
      log("重新全选商品-购物车当前已选择商品:" + (is_checked != null));
    }
  }
}

function click_i_know() {
  // 只要页面有 我知道了等按钮, 都盲点
  let retry_button = textMatches(/(我知道了|返回购物车)/);
  if (retry_button.exists()) {
    let temp = retry_button.findOne(100);
    log("通用方法:找到[" + temp.text() + "]按钮,直接点击");
    // 1. 配送运力已约满
    // 2. 门店已打烊
    // 3. 订单已约满
    if (temp != null) {
      temp.parent().click();
      commonWait();
      let temp2 = retry_button.findOne(100);
      if (temp2) {
        log("异常: 点击[我知道了]无效");
        let loc = temp2.bounds(); //1.匹配id寻找位置。
        log("通过坐标点击");
        click(loc.centerX(), loc.centerY());
      }
    }
  }
}

function commonWait() {
  sleep(COMMON_SLEEP_TIME_IN_MILLS);
}

function submit_order() {
  // 220417 , 目前单次约2.5秒, 2小时约2880次
  // 循环调用约2157次后, 堆栈达到1040KB,导致程序中止
  if (count >= MAX_TIMES_PER_ROUND) {
    // 大约每半小时休息几分钟
    toastLog("本轮捡漏没有成功, 稍后重新开始");
    return;
  }
  click_i_know();
  count = count + 1;
  log("抢菜第" + round + "-" + count + "次");
  if (count == 1 || count % 5 == 0) {
    toast("抢菜第" + round + "轮第" + count + "次");
  }

  //美团买菜 结算按钮无id
  if (!textStartsWith("结算").exists()) {
    log("未找到结算按钮，刷新页面");
    reload_mall_cart();
    submit_order();
  } else {
    // 记录商品信息
    let item = className("android.widget.TextView").depth(30);
    if (item.exists()) {
      log("第一件商品:" + item.findOne().text());
    }
    if (ACTIVE_SUBMIT == 0) {
      toastLog("观察模式, 仅监控商品");
    } else {
      // 全选购物车内有货商品
      check_all();
      // 极端情况下, 商品秒无, 这个时候会没有结算按钮, 需要再次判断
      // 只是 "结算" 按钮的话, 并未选择商品, 只有出现 "结算(*)" 才是选中了 , 这种情况会出现在早上6点左右, 服务器繁忙的情况下
      let submit_btn = textStartsWith("结算(").findOne(1000);
      if (submit_btn) {
        log("点击:" + submit_btn.text());
        submit_btn.parent().click(); //结算按钮点击
        commonWait();
        // 1. 配送运力已约满
        // 2. 门店已打烊
        // 3. 订单已约满 (这种情况可能会等比较长时间才返回)
        textMatches(/(我知道了|返回购物车|送达时间)/).findOne(5000);
        let retry_button = textMatches(/(我知道了|返回购物车)/).findOnce();
        if (retry_button) {
          log("点击->[" + retry_button.text() + "]");
          retry_button.parent().click();
          commonWait();
          // 这里必须要等待一定时长(>600), 否则下次结算一定概率会点击无效
          sleep(600);
          // 继续重试
          submit_order(count);
        } else {
          log("没有出现我知道了等失败信息");
          // sleep(1000);
          if (textStartsWith("放弃机会").exists()) {
            toast("跳过加购");
            textStartsWith("放弃机会").findOnce().parent().click();
            commonWait();
          } else {
            // 没有出现加购
          }
          textMatches(/(我知道了|返回购物车|送达时间|购物车)/).findOne(300);
          // 220421 高峰期,点击结算可能没反应
          if (textStartsWith("购物车").exists()) {
            log("异常: 还停留在购物车页面");
            submit_order();
          } else if (textStartsWith("送达时间").exists()) {
            toastLog("开始选择送达时间");
            selectTime();
          }
        }
      } else {
        // 判断是否是 [站点闭店休息中,暂时无法下单]
        let shopClosedTxt = textStartsWith("站点闭店").findOne(300);
        if (shopClosedTxt) {
          toastLog("异常: 站点已关闭, 稍后重试");
        } else {
          // 已经没有结算按钮了, 重试
          submit_order();
        }
      }
    }
  }
  log("DEBUG: [结算]执行结束");
}

function start() {
  if (ACTIVE_STOP_APP == 1) {
    kill_app(APP_NAME);
  }
  launchApp(APP_NAME);
  sleep(600);
  auto.waitFor();
  click_i_know();
  //跳过开屏广告
  btn_skip = id("btn_skip").findOne(5000);
  if (btn_skip) {
    btn_skip.click();
    toast("已跳过开屏广告");
    commonWait();
  } else {
    log("没有找到跳过开屏广告按钮");
  }
  sleep(600);
  //跳过后加载首页会有一段时间再加载出购物车

  to_mall_cart();
  count = 0;
  submit_order();
}

function kill_app(packageName) {
  var name = getPackageName(packageName);
  if (!name) {
    if (getAppName(packageName)) {
      name = packageName;
    } else {
      return false;
    }
  }
  app.openAppSetting(name);
  text(app.getAppName(name)).waitFor();
  let is_sure = textMatches(/(.*强.*|.*停.*|.*结.*|.*行.*|.*FORCE.*)/).findOne(
    3000
  );
  // log(is_sure);
  if (is_sure.enabled()) {
    is_sure.click();
    commonWait();
    buttons = textMatches(
      /(.*强.*|.*停.*|.*结.*|.*行.*|确定|是|.*FORCE.*)/
    ).find();
    if (buttons.length > 0) {
      buttons[buttons.length - 1].click();
      commonWait();
    } else {
      // 异常情况
      toast(app.getAppName(name) + "应用没有找到确认按钮");
      sleep(50000);
    }

    log(app.getAppName(name) + "应用已被关闭");
    sleep(1000);
    back();
  } else {
    log(app.getAppName(name) + "应用不能被正常关闭或不在后台运行");
    sleep(3000);
    // back();
  }
}
