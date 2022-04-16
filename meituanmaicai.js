/**
 * 真人模拟滑动函数 （滑块滑动）
 * @param {起点x} sx
 * @param {起点y} sy
 * @param {终点x} ex
 * @param {终点y} ey
 */
function randomSwipe(sx, sy, ex, ey) {
  //设置随机滑动时长范围
  var timeMin = 300;
  var timeMax = 800;
  //设置控制点极限距离
  var leaveHeightLength = 500;

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

  log("随机控制点A坐标：" + x2 + "," + y2);
  log("随机控制点B坐标：" + x3 + "," + y3);
  log("随机滑动时长：" + time[1]);
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

const musicNotify = () => {
  const m = "/storage/emulated/0/Download/心如止水.mp3";
  media.playMusic(m);
  sleep(media.getMusicDuration());
};

const to_mall_cart = () => {
  shopping_cart_btn = id("img_shopping_cart").findOne();
  if (shopping_cart_btn) {
    shopping_cart_btn.parent().click(); //btn上一级控件可点击
    //var loc = id("img_shopping_cart").findOne().bounds();//1.匹配id寻找位置。
    //click(loc.centerX(), loc.centerY());
    log("已进入购物车");
  } else {
    log("未找到购物车按钮，退出");
    exit;
  }
};

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

const reload_mall_cart = () => {
  // 切换标签页面
  log("重新加载购物车");
  randomSwipe(550, 700, 600, 1100);
  //to_mine();
  //sleep(5000);
  //to_mall_cart();
  sleep(3000);
};

const pay = () => {
  if (textStartsWith("立即支付").exists()) {
    textStartsWith("立即支付").findOne().parent().click();
    musicNotify();
  }
};

const selectTime = (countT, status) => {
  //选择送达时间
  textStartsWith("送达时间").findOne().parent().click();
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

  if (selectedTime != null) {
    log("选择可用时间");
    selectedTime.parent().click();
    sleep(50);

    // 判断是否提示运力已满
    if (textStartsWith("我知道了").exists()) {
      textStartsWith("我知道了").findOne().parent().click();
      sleep(50);
      if (textStartsWith("送达时间").exists()) {
        selectTime(countT, false);
      } else {
        selectTime(countT, false);
      }
    } else {
      status = true;
      pay();
    }
  } else {
    log("没有可用时间段")
    countT = countT + 1;
    if (countT > 18000) {
      toast("抢菜选择时间失败");
      exit;
    }
    sleep(100);
    log("开始重新选择时间")
    selectTime(countT, false);
  }
};

const submit_order = (count) => {
  count = count + 1;
  log("抢菜第" + count + "次尝试");
  if (count % 5 == 1) {
    toast("抢菜第" + count + "次尝试");
  }
  //美团买菜 结算按钮无id
  if (!textStartsWith("结算").exists()) {
    log("未找到结算按钮，刷新页面");
    reload_mall_cart();
    submit_order(count);
  } else {
    log("开始结算");
    let submit_btn = textStartsWith("结算").findOne();
    submit_btn.parent().click(); //结算按钮点击

    sleep(1200);

    let retry_button = textMatches(/(我知道了|返回购物车)/);
    if (retry_button.exists()) {
      // 1. 配送运力已约满
      // 2. 门店已打烊
      // 3. 订单已约满
      retry_button.findOne().parent().click();
      sleep(300);
    } else {
      sleep(1000);
      if (textStartsWith("放弃机会").exists()) {
        toast("跳过加购");
        textStartsWith("放弃机会").findOne().parent().click();
        selectTime(0, false);
      } else {
        log("存在其他情况");
      }
    }

    sleep(100);

    if (count > 18000) {
      toast("抢菜失败");
      exit;
    }
    submit_order(count);
  }
};

const start = () => {
  kill_app("美团买菜");

  const appName = "美团买菜";
  launchApp(appName);
  sleep(600);
  auto.waitFor();
  //跳过开屏广告
  btn_skip = id("btn_skip").findOne();
  if (btn_skip) {
    btn_skip.click();
    toast("已跳过开屏广告");
  } else {
    log("没有找到跳过开屏广告按钮");
  }
  sleep(600);
  //跳过后加载首页会有一段时间再加载出购物车

  to_mall_cart();
  log("等待购物车加载完成");
  sleep(3000); //等待购物车加载完成
  submit_order(0);
};

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
  let is_sure = textMatches(/(.*强.*|.*停.*|.*结.*|.*行.*)/).findOne();
  if (is_sure.enabled()) {
    textMatches(/(.*强.*|.*停.*|.*结.*|.*行.*)/)
      .findOne()
      .click();
    sleep(300);
    buttons = textMatches(/(.*强.*|.*停.*|.*结.*|.*行.*|确定|是)/).find();
    if (buttons.length > 0) {
      //sleep(500);
      buttons[buttons.length - 1].click();
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
    back();
  }
}

// 调试期间临时使用
engines.all().map((ScriptEngine) => {
  if (engines.myEngine().toString() !== ScriptEngine.toString()) {
    ScriptEngine.forceStop();
  }
});

start();
