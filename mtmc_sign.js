const APP_NAME = "美团买菜";

let {
  randomSwipe,
  clickScale,
  clickBottomScale,
  lock,
  unlock,
  kill_app,
  commonWait,
  clickByCoor,
  getWidth,
  getHeight,
  scrollDown,
  scrollUp,
} = require("./Utils.js");

unlock();

// 玩游戏撸羊毛
game();

function game() {
  kill_app(APP_NAME);
  launchApp(APP_NAME);
  sleep(5 * 1000);
  console.time("美团撸羊毛耗时");
  to_mine();
  to_checkIn();
  doInCheckIn();
  to_mine();
  to_fruit();
  doInFruit();
  home();
  sleep(2000);
  lock();
  console.timeEnd("美团撸羊毛耗时");
}

function to_mine() {
  if (text("我的订单").findOnce()) {
    log("当前已经在[我的]页面");
  } else {
    let mineBtn = id("com.meituan.retail.v.android:id/img_mine").findOnce();
    let tempI = 0;
    while (!mineBtn && tempI < 5) {
      tempI++;
      back();
      sleep(2000);
      mineBtn = id("com.meituan.retail.v.android:id/img_mine").findOnce();
    }
    if (mineBtn) {
      clickByCoor(mineBtn);
      text("我的订单").findOne(2000);
      sleep(1000);
    } else {
      isFailed = true;
      console.error("无法找到进入[我的]的按钮");
    }
  }
}

function to_checkIn() {
  let btn = text("签到领币").findOne(2000);
  if (btn) {
    btn.parent().click();
  }
}

function doInCheckIn() {
  if (textStartsWith("我的买菜币").findOne(2000)) {
    sleep(2000);
    if (text("立即签到").exists()) {
      click("立即签到");
      sleep(2000);
      click("分享给好友");
      sleep(3000);
      back();
      text("登录微信").exists() && back();
      sleep(2000);
    } else {
      log("已经签到过了");
    }

    if (text("去分享，再领一次买菜币").exists()) {
      click("去分享，再领一次买菜币");
      sleep(1000);
      click("微信好友");
      sleep(2000);
      back();
      sleep(1000);
      click("知道了");
      sleep(1000);
    } else {
      log("已经分享过了");
    }
    let reward3 = text("3天").findOnce();
    reward3 &&
      click(reward3.bounds().centerX(), reward3.bounds().centerY() - 95) &&
      sleep(2000);
    click("开心收下");

    let reward7 = text("7天").findOnce();
    reward7 &&
      click(reward7.bounds().centerX(), reward7.bounds().centerY() - 95) &&
      sleep(2000);
    click("开心收下");

    while (text("领任务").exists()) {
      click("领任务");
      sleep(1000);
    }

    if (text("去逛逛").exists()) {
      if (text("2/2").exists()) {
        log("今日[去逛逛]已经完成了");
      } else {
        log("开始[去逛逛]任务");
        click("去逛逛");
        sleep(10 * 1000);
        scrollDown();
        sleep(10 * 1000);
        log("结束[去逛逛]任务");
      }
    }
  } else {
    console.warn("进入[签到领币]页面失败");
  }
}

function to_fruit() {
  let fruitBtn = text("天天果园").findOne(2000);
  if (fruitBtn) {
    fruitBtn.parent().click();
  }
}

// 屏幕上半部分的坐标一般不用动, 下半部分需要计算Y偏移量
function doInFruit() {
  try {
    if (text("天天果园").findOne(2000)) {
      sleep(5000);
      // 0. 疫情通知
      click("我知道了");

      // 选择第一水果 384,738,501,855 clickable(false).depth(22).className("android.view.View").indexInParent(1);
      // 选择第二水果 858,738,975,855 clickable(false).depth(22).className("android.view.View").indexInParent(1);
      // 选择第三水果 621,1248,738,1365 clickable(false).depth(22).className("android.view.View").indexInParent(1);
      // text("立即种下万能果") 300,1746,780,1809 clickable(false).depth(21).className("android.view.View").indexInParent(1);

      // 1. 选择水果
      let choiceFruitBtn = text("选择水果").findOne(1000);
      if (choiceFruitBtn) {
        log(
          choiceFruitBtn.bounds(),
          choiceFruitBtn.bounds().centerX(),
          choiceFruitBtn.bounds().centerY()
        );
        clickScale(798, 796, "选择第二个水果[苹果]");
        sleep(1000);
        let btn1 = textMatches("立即种下.+").findOnce();
        if (btn1) {
          btn1.parent().click();
        }
        btnHappyGet();
      }

      // 2. [登录礼包] S8(995,465);
      clickScale(995, 465, "登录礼包");
      sleep(1000);
      // 确认领取
      let btn4 = text("领取今日奖励").findOne(1000);
      if (btn4) {
        clickByCoor(btn4); // click("领取今日奖励");
        sleep(1000);
      } else {
        log("今日[登录礼包]已领取"); // 明天记得再来哦
      }
      click("明天记得再来哦"); // 关闭登录礼包页面
      sleep(1000);

      // 3. 点击 [领水滴] S8 (115,1970)
      toastLog("点击[领水滴]");
      clickBottomScale(115, 1950, "领水滴");
      sleep(3000);
      btnHappyGet();

      if (text("领取").exists()) {
        click("领取");
        sleep(2000);
        btnHappyGet();
      }
      if (text("领任务").exists()) {
        click("领任务");
        sleep(2000);
        btnHappyGet();
        sleep(1000);
      }
      if (text("去分享").exists()) {
        click("去分享");
        sleep(1000);
        clickScale(833, 937, "关闭分享口令页面"); // 生成口令的 关闭按钮 Note9(833, 937);
        sleep(1000);
        click("领取");
        sleep(1000);
        btnHappyGet();
        sleep(1000);
      }
      // 关闭 [领水滴] 弹框
      click(getWidth() / 2, getHeight() / 2 - 300);
      sleep(1000);

      // 4. [浇水] S8(928,1916)
      for (i = 0; i < 3; i++) {
        toastLog("[浇水]第" + (i + 1) + "次开始");
        clickBottomScale(928, 1916, "浇水");
        sleep(3000);
        btnHappyGet();
      }
    } else {
      log("进入[天天果园]失败了");
      back();
      commonWait();
    }
  } catch (e) {
    console.error(e);
    console.error(e.stack);
  }
}

// 开心收下
function btnHappyGet() {
  clickBottomScale(540, 1585, "开心收下"); // 按照S8 适配
  sleep(2000);
}
