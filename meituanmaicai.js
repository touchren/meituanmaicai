// 常量定义
const APP_NAME = "美团买菜";
const PACKAGE_NAME = "com.meituan.retail.v.android";
const AUTO_JS_PACKAGE_NAMES = [
  "com.taobao.idlefish.x", // 困鱼
  "org.autojs.autoxjs", // Autoxjs
];
const OTHER_ALLOW_PACKAGE_NAMES = [
  "com.samsung.android.app.smartcapture", //录屏程序(Note9)
  "com.samsung.android.app.cocktailbarservice", // 新消息顶部浮框
  "com.sec.android.app.launcher", //可能是桌面
  "com.android.systemui", // 通知栏
];
const VERSION = "v220530";

// 最大尝试轮数
const MAX_ROUND = 5;
// 每轮最长重试次数 (捡漏模式平均单次1.42秒)
// 05/10 10分钟300次
const MAX_TIMES_PER_ROUND = 300;
// 是否启用 结算 功能, 0:不启用, 1:启用
const ACTIVE_SUBMIT = 1;
// 点击按钮之后的通用等待时间
const COMMON_SLEEP_TIME_IN_MILLS = 50;
// 是否先强行停止APP
const ACTIVE_STOP_APP = 1;
// 几秒提醒一次
const SECOND_PER_TIME = 5;
// 开卖时间
const SALE_BEGIN_TIME_ARR = ["06:00"];
// 对于部分只能通过坐标点击的对象, 按照(1080, 2220)进行适配
const DEFAULT_DEVICE_WIDTH = 1080;
const DEFAULT_DEVICE_HEIGHT = 2220;

// 第几轮
var round = 0;
// 本轮执行第几次
var count = 0;
// 选择时间本轮选择第几次 (220501, 目前时间已经会自动选择, 所以这个值已经暂时没有用处了)
var countT = 1;
// 立即支付尝试了第几次 (220501, 现在抢菜主要就是一直点这个按钮)
var countP = 0;
// 确认已失败
var isFailed = false;
// 确实已成功
var isSuccessed = false;

// 过滤商品的正则表示式 查看 config.js
var itemFilterStr = ".*(测试商品|蛏子).*";

var autoAddItems = new Array();

// 任务中断次数
var interruptCount = 0;

// 未知页面连续次数
var unKnownPageCount = 0;

// 是否启动录屏
var activeRecord = 0;

// 是否启动高峰期录屏(准点开售)
var activePeakRecord = 1;

// 是否在录屏中
var isRecording = false;

// 连续无商品得判断次数
var noItemCount = 0;

// Note20U Android12 ,这个值是 2
// Note9, S8, 这个值是23
var scrollViewDepth = 0;
var SCROLL_VIEW_DEPTH_NOTE20U = 2;

// 调试期间临时使用, 关闭其他脚本
engines.all().map((ScriptEngine) => {
  log("engines.myEngine().toString():" + engines.myEngine().toString());
  if (engines.myEngine().toString() !== ScriptEngine.toString()) {
    ScriptEngine.forceStop();
  }
});
log("version:", VERSION);
auto.waitFor();
device.wakeUp();
sleep(1000);

// 在定时任务执行时间的前一分钟先启动闹钟, 给手机亮屏
closeClock();
// 解锁手机
unlock();

// 覆盖配置项内部, 并设置粘贴板
// getConfig(); //暂不需要

// 开始循环执行
while (round < MAX_ROUND) {
  round++;
  log("开始第" + round + "轮抢菜");
  try {
    start();
  } catch (e) {
    log("ERROR2: 出现中断性问题", e);
    log(e.stack);
  }

  let totalTime = random(1, 5);
  for (let i = 0; i < totalTime; i++) {
    toastLog(
      "第" +
        round +
        "轮抢菜执行结束, 等待" +
        (totalTime * SECOND_PER_TIME - i * SECOND_PER_TIME) +
        "秒后继续"
    );
    sleep(SECOND_PER_TIME * 1000);
  }
}
home();
toastLog("程序已结束");

// 开始录屏

function start() {
  startRecord();
  count = 0;
  isFailed = false;
  isSuccessed = false;
  if (ACTIVE_STOP_APP == 1) {
    kill_app(APP_NAME);
  }
  launchApp(APP_NAME);
  commonWait();
  if (ACTIVE_STOP_APP == 1) {
    //跳过开屏广告
    btn_skip = id("btn_skip").findOne(2000);
    if (btn_skip) {
      btn_skip.click();
      toast("已跳过开屏广告");
      commonWait();
    } else {
      log("没有找到跳过开屏广告按钮");
    }
    sleep(5000);
  }
  sleep(1000);

  while (count < MAX_TIMES_PER_ROUND && !isFailed && !isSuccessed) {
    // 1. 首页 [搜索] 当前位置只可自提
    // 2. 购物车 [我常买]
    // 3. 提交订单 [提交订单, 自提时间, 送达时间, 立即支付]
    // 4. 支付订单 [支付订单,免密支付], 完成
    // 5. 订单详情 [订单详情]
    // toast提示 [前方拥堵，请稍后再试] , 会自动消失可以不用管
    if (activePeakRecord == 1) {
      checkSaleTime();
    }
    click_i_know();
    //console.time("判断当前页面耗时");
    let page = textMatches(
      /(我知道了|确定|返回购物车|搜索|我常买|提交订单|支付订单|验证指纹|订单详情|加入购物车|到货提醒我|全部订单|请确认地址|去支付|请输入支付密码|支付成功|搜索|困鱼|日志|.*新版本.*)/
    ).findOne(200); // 大约80ms
    //console.timeEnd("判断当前页面耗时");
    if (page) {
      count++;
      unKnownPageCount = 0;
      if (page.text() != "日志" && page.text() != "困鱼") {
        // 不能打印, 否则日志会刷屏
        log(
          "抢菜第" + round + "-" + count + "次,进入条件1:[" + page.text() + "]"
        );
      }
      if (page.text() == "我常买") {
        // 购物车
        doInItemSel();
      } else if (page.text() == "搜索") {
        // 首页
        doInHome();
      } else if (page.text() == "请输入支付密码") {
        // 22/05/30 [免密支付] 一段时间后需要再次输入密码
        musicNotify("05.need_manual");
        sleep(SECOND_PER_TIME * 1000);
      } else if (page.text().indexOf("新版本") != -1) {
        let closeBtn = id("btn_close").findOnce();
        closeBtn && clickByCoor(closeBtn);
      } else if (page.text() == "请确认地址") {
        confirmAddress();
      } else if (page.text() == "提交订单") {
        // 提交订单
        doInSubmit();
        // 调试的情况可以进行替换, 不会提交订单
        //backInSubmit();
      } else if (page.text() == "支付订单" || page.text() == "验证指纹") {
        // 支付订单
        doInPay();
      } else if (page.text() == "订单详情" || page.text() == "支付成功") {
        // 支付详情
        doInPaySuccess();
      } else if (page.text() == "加入购物车" || page.text() == "到货提醒我") {
        // 支付详情
        back();
        commonWait();
      } else if (page.text() == "全部订单" || page.text() == "搜索") {
        // 商品详情页, 跳转至购物车
        // 首页/分类/我的页面
        to_mall_cart();
      } else if (page.text() == "我知道了" || page.text() == "返回购物车") {
        // 系统提示, 点掉即可
        printReason(page);
        click_i_know();
      } else if (page.text() == "困鱼" || page.text() == "日志") {
        waitCheckLog();
      } else if (page.text() == "去支付") {
        sleep(SECOND_PER_TIME * 1000);
      } else {
        console.error("ERROR3: 当前在其他页面");
        back();
        commonWait();
        launchApp(APP_NAME);
        commonWait();
      }
    } else {
      unKnownPageCount++;
      console.error("ERROR4: 未知页面");
      printPageUIObject();
      sleep(500);
      //musicNotify("09.error");
      //sleep(2000);
      if (unKnownPageCount % 20 == 0) {
        console.warn("未知页面连续出现%s次", unKnownPageCount);
        back();
        commonWait();
      }
    }

    let packageName = currentPackage();
    if (
      packageName != PACKAGE_NAME &&
      AUTO_JS_PACKAGE_NAMES.indexOf(packageName) == -1 &&
      OTHER_ALLOW_PACKAGE_NAMES.indexOf(packageName) == -1
    ) {
      interruptCount++;
      log(
        "WANR: 页面已经被切至:" +
          packageName +
          ",当前第" +
          interruptCount +
          "次"
      );
      if (interruptCount == 50) {
        log("重新切换应用[" + APP_NAME + "]");
        unlock();
        home();
        commonWait();
        launchApp(APP_NAME);
        commonWait();
      }
    } else {
      interruptCount = 0;
    }
  }

  if (!isPeakTime() || isSuccessed) {
    // 玩游戏撸羊毛
    game();
  }

  toastLog(
    "第" +
      round +
      "轮执行结束, 总共执行" +
      count +
      "次, isFailed: " +
      isFailed +
      ", isSuccessed:" +
      isSuccessed
  );

  stopRecord();
}

function checkSaleTime() {
  let nextTime = new Date(new Date().getTime() + 60 * 1000);
  let hour = nextTime.getHours();
  if (hour < 10) {
    hour = "0" + hour;
  }
  let minute = nextTime.getMinutes();
  if (minute < 10) {
    minute = "0" + minute;
  }
  var second = nextTime.getSeconds();
  let nextTimeStr = hour + ":" + minute;
  if (SALE_BEGIN_TIME_ARR.indexOf(nextTimeStr) != -1) {
    // 1分钟 之后开始销售
    if ((60 - second) % SECOND_PER_TIME == 0) {
      toastLog("还有[" + (60 - second) + "]秒开放下单");
    }
    if (second < 30) {
      // 避免不适配的手机一直重试
      activeRecord = 1;
      startRecord();
      activeRecord = 0;
    }
  }
}

function isPeakTime() {
  let result = false;
  SALE_BEGIN_TIME_ARR.forEach((o, i) => {
    if (isPeakTimeStr(o, 1 * 60 * 1000, 6 * 60 * 1000)) {
      result = true;
      return;
    }
  });
  return result;
}

// 马上开售则等待到开始, 否则跳过
function sleepToSale() {
  let result = false;
  let tempI = 0;
  do {
    tempI++;
    if (tempI % 1000 == 0) {
      log("等待开售判断第%s次", tempI); // 2s打印一次
    }
    SALE_BEGIN_TIME_ARR.forEach((o, i) => {
      if (isPeakTimeStr(o, 15 * 1000, -5)) {
        result = true;
        sleep(1); // 判断500次, 大约1s, 如果不添加这行, 500次, 大约30ms
        return;
      } else {
        result = false;
      }
    });
  } while (result);
  // log("判断%s次后结束", tempI);
}

function doInHome() {
  to_mall_cart();
}

function doInPay() {
  confirm_to_pay();
}

function doInPaySuccess() {
  isSuccessed = true;
  // 等待一定时间
  let totalTime = 10 / (SECOND_PER_TIME * 2);
  for (let i = 0; i < totalTime && text("完成").exists(); i++) {
    toastLog((totalTime - i) * SECOND_PER_TIME * 2 + "秒之后完成");
    musicNotify("03.pay_success");
    sleep(SECOND_PER_TIME * 2 * 1000);
  }
  // 返回购物车页面
  let returnBtn = text("完成").findOnce();
  if (returnBtn) {
    log("找到[%s]按钮", returnBtn.text());
    clickByCoor(returnBtn);
    commonWait();
  } else {
    log("可能已经手工点击[完成按钮]");
  }
}

// 220502 这个功能主要用于收货地址与定位地址距离较远的情况下, 选择[家]这个标签对应的地址,并[确认选择]
function confirmAddress() {
  let homeAddrBtn = text("家").findOne(1000);
  if (homeAddrBtn) {
    clickByCoor(homeAddrBtn);
    let confirmBtn = text("确认选择").findOne(100);
    if (confirmBtn) {
      confirmBtn.parent().click();
      commonWait();
      sleep(1000);
    }
  } else {
    musicNotify("05.need_manual");
    sleep(SECOND_PER_TIME * 1000);
  }
}

function to_mall_cart() {
  if (textStartsWith("我常买").exists()) {
    log("当前已经在购物车页面");
  } else {
    // 22/05/23 适配Note20U进入购物车按钮
    shopping_cart_btn =
      idMatches(/.*(img_shopping_cart|cartredDotTextView).*/).findOne(1000) ||
      className("android.widget.RelativeLayout").depth(1).findOnce(2);
    if (shopping_cart_btn) {
      clickByCoor(shopping_cart_btn);
      log("已点击[购物车]按钮,等待购物车加载完成");
      text("删除").findOne(2000);
      sleep(500);
    } else {
      console.log("未找到购物车按钮");
      back();
      commonWait();
    }
  }
}

function game() {
  console.time("美团撸羊毛耗时");
  to_mine();
  to_checkIn();
  doInCheckIn();
  to_mine();
  to_fruit();
  doInFruit();
  console.timeEnd("美团撸羊毛耗时");
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
      sleep(1000);
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
        randomSwipe(
          getWidth() / 2,
          random(1500, 1600),
          getWidth() / 2,
          random(300, 400)
        );
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

// 推荐商品选购
function itemRecomSel() {
  console.time("自动添加购物车耗时");
  let i = 0;
  try {
    let recomItemsView = className("ScrollView").findOnce();
    addAllItemsToCart();
    do {
      i++;
      // 一次翻页大概480ms
      recomItemsView.scrollDown();
      while (textMatches(".*飞速加载.*").findOne(200)) {
        log("正在加载推荐商品, 稍后继续", i);
        sleep(300);
      }
      addAllItemsToCart();
    } while (i < 45 && !textMatches("美团自营|已经到底啦").exists());
  } catch (e) {
    console.error(e);
    console.error(e.stack);
  }
  log("总共翻页%s次,自动添加的商品:", i, autoAddItems);
  scrollToTopInCart();
  console.timeEnd("自动添加购物车耗时");
  // sleep(30000);
}

function addAllItemsToCart() {
  try {
    let activeItems = findActiveFilterItems();
    for (let ii = 0; ii < activeItems.length; ii++) {
      let isSuccess = false;
      let j = 0;
      do {
        j++;
        isSuccess = clickRadioByItem(activeItems[ii]);
      } while (!isSuccess && j < 5);
    }
  } catch (e) {
    console.error(e);
    console.error(e.stack);
  }
}

function findActiveFilterItems() {
  var activeItems = new Array();
  // 打印所有可买商品
  let allItems = listAllFilterItems();
  for (var i = 0; i < allItems.length; i++) {
    var tempItem = allItems[i];
    //if (filterActiveItem(tempItem)) {
    // 过滤黑名单里面的商品
    activeItems.push(tempItem);
    //}
  }
  return activeItems;
}

// 查询符合条件的商品列表
// 购物车 页面
function listAllFilterItems() {
  let con1 = text("买过的都在这里找").findOnce();
  let items = new Array();
  if (con1) {
    //log("买过的都在这里找.depth()=", con1.depth());
    if (isNote20U()) {
      items = con1
        .parent()
        .parent()
        .find(textMatches(itemFilterStr).depth(5).indexInParent(1));
    } else {
      items = con1
        .parent()
        .parent()
        .find(textMatches(itemFilterStr).depth(28).indexInParent(2));
    }
    items.forEach((child, idx) => {
      log(
        "第" + (idx + 1) + "项(" + child.depth() + ")常买商品:" + child.text()
      );
    });
  }
  items.push.apply(items, listAllFilterItems2());
  return items;
}

// 查询符合条件的商品列表
// 购物车 页面
function listAllFilterItems2() {
  let items = new Array();
  if (isNote20U()) {
    items = textMatches(itemFilterStr).depth(4).indexInParent(0).find();
  } else {
    items = textMatches(itemFilterStr).depth(27).indexInParent(1).find();
  }
  items.forEach((child, idx) => {
    log("第" + (idx + 1) + "项(" + child.depth() + ")text:" + child.text());
  });
  return items;
}

function isNote20U() {
  return scrollViewDepth == SCROLL_VIEW_DEPTH_NOTE20U;
}

function clickRadioByItem(item) {
  // 22/05/23 这里有个很奇葩的问题, 可能因为页面刷新的关系, 所以对象在进方法前后, 已经发生了变化, 导致取不到.parent()对象
  try {
    let itemDiv = item.parent();
    if (isNote20U()) {
      let checkBtns = itemDiv.find(className("android.view.ViewGroup"));
      // 添加购物车的图片在右下角, 应该是最后一个
      let checkBtn = checkBtns[checkBtns.length - 1];
      let notChecked = checkBtn.childCount() == 0;
      if (notChecked) {
        if (autoAddItems.indexOf(item.text()) != -1) {
          log("本轮已自动添加过物品[%s]进入购物车", item.text());
        } else {
          toastLog("点击[" + item.text() + "]的添加购物车按钮");
          checkBtn.click();
          autoAddItems.push(item.text());
          sleep(2000);
        }
      } else {
        log("物品[%s]已加入购物车", item.text());
      }
    } else {
      let checkBtns = itemDiv.find(className("android.widget.ImageView"));
      // 添加购物车的图片在右下角, 应该是最后一个
      let checkBtn = checkBtns[checkBtns.length - 1];
      let notChecked = checkBtn.parent().childCount() == 1;
      if (notChecked) {
        if (autoAddItems.indexOf(item.text()) != -1) {
          log("本轮已自动添加过物品[%s]进入购物车", item.text());
        } else {
          toastLog("点击[" + item.text() + "]的添加购物车按钮");
          checkBtn.parent().click();
          autoAddItems.push(item.text());
          sleep(2000);
        }
      } else {
        log("物品[%s]已加入购物车", item.text());
      }
    }
    return true;
  } catch (e) {
    return false;
  }
}

function scrollToTopInCart() {
  let recomItemsView = className("ScrollView").findOnce();
  let i = 0;
  let maxTimes = isPeakTime() ? 10 : 45;
  while (!text("您可能想买").exists() && i < maxTimes) {
    i++;
    recomItemsView.scrollUp();
  }
  recomItemsView.scrollUp();
  if (i == 45) {
    console.warn(
      "滚动至购物车顶部达到上限, 可能[您可能想买]未加载成功, 或者其他问题"
    );
  }
}

function reload_mall_cart() {
  // 没有结算按钮的情况下, 才会重载购物车
  // log("重新加载购物车");
  if (!textStartsWith("您的购物车还空着呢").exists()) {
    scrollToTopInCart();
    randomSwipe(
      560 + random(0, 50),
      400 + random(0, 100),
      500 + random(0, 50),
      1500 + random(0, 100)
    );
    if (ACTIVE_SUBMIT == 1) {
      sleep(random(100, 200));
    } else {
      sleep(SECOND_PER_TIME * 1000);
    }
    if (textMatches(".*暂停线上服务.*").exists()) {
      console.info("检测到[暂停线上服务]");
      isFailed = true;
    } else if (textMatches(".*件失效商品").findOne(2000)) {
      noItemCount = 0;
    } else {
      let shopCartBtn =
        id("img_shopping_cart").findOnce() ||
        className("android.widget.RelativeLayout").depth(1).findOnce(2);
      if (shopCartBtn) {
        if (
          (isNote20U() && shopCartBtn.childCount() == 0) ||
          (!isNote20U() && shopCartBtn.parent().childCount() == 1)
        ) {
          log("购物车内可能无商品");
          noItemCount++;
          if (noItemCount >= 10) {
            toastLog("当前购物车内无商品,请添加后重试");
            // 您的购物车还空着呢~快去逛逛吧
            isFailed = true;
          }
        }
      }
    }
  } else {
    toastLog("当前购物车内无商品,请添加后重试");
    // 您的购物车还空着呢~快去逛逛吧
    isFailed = true;
  }
}

function doInItemSel() {
  countP = 0;
  countT = 1;
  // 220417 , 目前单次约2.5秒, 2小时约2880次
  if (count >= MAX_TIMES_PER_ROUND) {
    // 大约每半小时休息几分钟
    toastLog("本轮捡漏没有成功, 稍后重新开始");
    return;
  }
  if (count == 1 || count % SECOND_PER_TIME == 0) {
    toast("抢菜第" + round + "轮第" + count + "次");
  }
  if (scrollViewDepth == 0) {
    let recomItemsView = className("ScrollView").findOnce();
    if (recomItemsView) scrollViewDepth = recomItemsView.depth();
  }

  // 22/05/23, 每轮总共执行3次
  if (!isPeakTime()) {
    if (count % 300 == 10) {
      itemRecomSel();
    } else {
      addAllItemsToCart();
    }
  }

  let submit_btn = textMatches("结算.*|重新加载").findOne(500); //大概100ms, 中间两个颜色点的过渡效果
  if (!submit_btn) {
    // log("未找到结算按钮，刷新页面");
    reload_mall_cart();
  } else {
    if (ACTIVE_SUBMIT == 0) {
      toastLog("观察模式, 仅监控商品");
      reload_mall_cart();
    } else {
      if (submit_btn.text().indexOf("结算") != -1) {
        // 220501, 因为美团是整个购物车里面, 只要有一件商品售罄, 整个订单都会提交失败, 所以默认有商品就可以了, 不进行全选
        // 05/06 无货商品会自动移除/减数量
        // 极端情况下, 商品秒无, 这个时候会没有结算按钮, 需要再次判断
        // 只是 "结算" 按钮的话, 并未选择商品, 只有出现 "结算(*)" 才是选中了 , 这种情况会出现在早上6点左右, 服务器繁忙的情况下
        if (submit_btn.text().indexOf("(") != -1) {
          // 05/11 这里除了[前方拥堵.*]之外, 需要等待大概600ms, 否则可能会点击无效
          if (count % 10 == 1) {
            check_all2();
          }
          let tempI = 0;
          // 总共点10次, 大约1秒
          // [我知道了]有可能出现在购物车页面
          // btn.click() 统计50次, 50-100 10:39.856 - 11:51.647 , 耗时 71.8秒 (两轮有效一轮)
          // press(btn) 同上, 16:37.684 - 17:38.324 , 耗时 60.6秒 35:11.115 - 36:15.649 , 耗时 64.5秒 , 大部分情况有效 , 44:46.161 -
          // 先click(), 后press, 同上,  (两轮里面会有一轮不出现 [我知道了]) 20:46.346 - 22:01.823 , 耗时 75.5秒
          // 先press, 后click(), (也是两轮里面会有一轮无效) 25:22.216 - 26:33.752, 耗时71.5秒

          // // 马上开售则等待到开始, 否则跳过
          sleepToSale();
          // 22/05/19 Note9 大部分情况下, 点击3次就能进入 我知道了, 其他情况, 点击10次依然不行, 最大次数调整到5次
          // 22/05/29 调整到10次之后, 效果反而更差, 所以推测连续点击反而会一直disable, 调整为3次
          while (submit_btn && tempI < 5) {
            // sleep(10)的情况下, 整个循环平均单次40ms
            tempI++;
            //if (tempI % 2 != 2) {
            clickByCoorNoWait(submit_btn);
            // } else {
            //   let btn2 = submit_btn.parent();
            //   if (btn2) {
            //     btn2.click(); // 0518, 进入购物两次里面就有会有一次一直点击失效, 即使持续20次, 3秒多的情况下(页面应该已经加载完成了)
            //   }
            // }
            let random1 = tempI % 2 == 1 ? 0 : random(500, 1000);
            let sleepTime = (tempI + 1) * 50 + random1;
            console.time(
              "第" +
                tempI +
                "次点击[" +
                submit_btn.text() +
                "], 最长等待" +
                sleepTime +
                "ms耗时"
            );
            let isNext = textMatches(
              /(我知道了|[0-2]{1}\d:\d{2}-[0-2]{1}\d:\d{2})/
            ).findOne(sleepTime);
            console.timeEnd(
              "第" +
                tempI +
                "次点击[" +
                submit_btn.text() +
                "], 最长等待" +
                sleepTime +
                "ms耗时"
            );
            log(
              "第%s次点击[%s], 有效:%s",
              tempI,
              submit_btn.text(),
              isNext != null
            );
            if (isNext) {
              submit_btn = null;
            } else {
              submit_btn = textStartsWith("结算(").findOnce();
            }
          }
          // commonWait(); // 把一些打印日志的操作转移到点击之后的等待过程
          // 记录商品信息
          // let item = className("android.widget.TextView").depth(30).findOne(100);
          // if (item) {
          //   log("第一件商品:" + item.text());
          // }
          // 1. 配送运力已约满
          // 2. 门店已打烊
          // 3. 订单已约满 (这种情况可能会等比较长时间才返回)
          // 05/09 这里不能使用[提交订单]来判断, 会影响效率
          let nextBtn = textMatches(
            /(我知道了|返回购物车|立即支付|极速支付|[0-2]{1}\d:\d{2}-[0-2]{1}\d:\d{2})/
          ).findOne(1000);
          if (nextBtn) {
            log("进入条件6: ", nextBtn.text()); // 非高峰期550ms
            if (
              nextBtn.text() == "我知道了" ||
              nextBtn.text() == "返回购物车"
            ) {
              //console.time("点击->01[" + nextBtn.text() + "]耗时");
              printReason(nextBtn);
              nextBtn.parent().click(); // 5ms
              //console.timeEnd("点击->01[" + nextBtn.text() + "]耗时");
              commonWait(); // 100-150ms
              //sleep(300);
              // if (text("提交订单").exists()) {
              //   backInSubmit();
              // } else {
              //   // 如果在购物车页面的话
              //   // 这里必须要等待一定时长(>600), 否则下次结算一定概率会点击无效
              //   //commonWait();
              //   //sleep(600);
              // }
            } else if (nextBtn.text().indexOf("前方拥堵") != -1) {
              // 这个toast有可能出现购物车, 也可能出现在[提交订单]页面
            } else {
              // 立即支付|极速支付|20:00-22:00
              log("没有出现我知道了等失败信息");
              // sleep(1000);
              // if (textStartsWith("放弃机会").exists()) {
              //   toast("跳过加购");
              //   textStartsWith("放弃机会").findOnce().parent().click();
              //   commonWait();
              // } else {
              //   // 没有出现加购
              // }
            }
          } else {
            //console.info("ERROR7: 点击[结算]无效, 可能需要等待");
            //count--;
            //musicNotify("09.error");
            // commonWait();
          }
        } else {
          // 没有选择商品的情况下, 进行全选
          check_all2();
          // 判断是否是 [站点闭店休息中,暂时无法下单]
          let ClosedTxt = textMatches(
            ".*本站点暂停线上服务.*|.*仅支持自提.*"
          ).findOnce();
          if (ClosedTxt) {
            toastLog("异常: " + ClosedTxt.text());
            isFailed = true;
          } else {
            // 已经没有结算按钮了, 重试
          }
        }
      } else {
        // 重新加载
        submit_btn.parent().click();
        commonWait();
      }
    }
  }

  // log("DEBUG: [结算]执行结束");
}

function check_all2() {
  // 先从底部购物车右上角查看all是多少
  //console.time("全选商品耗时"); // 已经全选的情况下大约20ms
  try {
    let shopCartBtn =
      id("img_shopping_cart").findOne(100) ||
      className("android.widget.RelativeLayout").depth(1).findOnce(2);
    if (
      shopCartBtn &&
      ((isNote20U() && shopCartBtn.childCount() == 1) ||
        (!isNote20U() && shopCartBtn.parent().childCount() > 1))
    ) {
      let allNumber = isNote20U()
        ? shopCartBtn.child(0).text()
        : shopCartBtn.parent().child(1).text();
      // 构造"结算(allNumber)"的字符串用于匹配
      let matchText = "结算(" + allNumber + ")";
      // 找到结算按钮的text
      let realText = textStartsWith("结算").findOne(200).text();
      // 如果两者不匹配，则没有全选中
      let allChecked = matchText === realText;
      if (!allChecked) {
        let radio_checkall = text("全选").findOne(200);
        clickByCoor(radio_checkall);
      }
    }
  } catch (e) {
    console.error(e);
    console.error(e.stack);
  }
  //console.timeEnd("全选商品耗时");
}

function backInSubmit() {
  click_i_know();
  let checkTxt = text("提交订单").findOnce();
  if (checkTxt) {
    // log("通过左上角图标执行[返回]");
    //if (isNote20U()) {
    let returnBtn = checkTxt
      .parent()
      .find(
        className("android.view.ViewGroup").clickable(true).indexInParent(1)
      )
      .get(0);
    if (returnBtn) {
      //if (count % 2 == 0) {
      log("通过.click()方法返回购物车");
      returnBtn.click();
      commonWait();
      // } else {
      //   clickByCoor(returnBtn);
      // }
    } else {
      console.warn("没有找到左上角的返回按钮");
      back();
      commonWait();
    }
  }
}

function doInSubmit() {
  countT++;
  let timeTxt = className("android.widget.TextView")
    .textMatches(/([0-2]{1}\d:\d{2}-[0-2]{1}\d:\d{2})/)
    .findOne(300);
  if (timeTxt) {
    log("INFO 已选择时间:" + timeTxt.text());
    pay();
  } else {
    if (textMatches(/(前方拥堵.*)/).exists()) {
      // 0508 目前这种情况就是没有挤进去, 需要返回购物车
      log("出现[前方拥堵.*], 返回购物车");
      backInSubmit();
    } else if (textMatches(/(立即支付|极速支付)/).exists()) {
      let arriveTimeBtn = textStartsWith("选择送达时间").findOne(1000);
      if (arriveTimeBtn) {
        // 220501, 理论上, 现在应该不会进这段逻辑了
        //选择送达时间
        arriveTimeBtn.parent().click();
        log("选择时间第" + round + "-" + countT + "次");
        if (countT == 1 || countT % SECOND_PER_TIME == 0) {
          toast(
            "第" +
              round +
              "-" +
              countT +
              "次点击->" +
              textStartsWith("送达时间").findOne(2000).text()
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
          log("点击->[" + selectedTime.text() + "]");
          selectedTime.parent().click();
          commonWait();
          let retry = textMatches(/(我知道了|返回购物车)/).findOne(1000);
          // 判断是否提示运力已满
          if (retry) {
            log("点击->[" + retry.text() + "]");
            retry.parent().click();
            commonWait();
          }
        } else {
          log("没有可用时间段");
          if (countT > MAX_TIMES_PER_ROUND) {
            toast("抢菜选择时间失败");
            return;
          }
        }
        log("DEBUG: [选择时间]结束");
      } else {
        console.error("ERROR1: 没有[送达时间]按钮");
      }
    } else {
      log("[提交订单]进入空白页面, 返回购物车");
      backInSubmit();
    }
  }
}

function printReason(iKnow) {
  // [当前不在可下单时段] - [每日6:00开放下单, 当前时间无法下单, 感谢您的理解] - [我知道了]
  let needPrint = true;
  iKnow
    .parent()
    .parent()
    .find(textMatches(".+"))
    .forEach((child, idx) => {
      if (needPrint) {
        if (
          child.text() != "订单已约满" &&
          child.text() != "当前不在可下单时段" &&
          child.text() != "门店已打烊"
        ) {
          log(
            "第" + (idx + 1) + "项(" + child.depth() + ")text:" + child.text()
          );
        } else {
          needPrint = false;
        }
      }
    });
  if (needPrint) {
    printPageUIObject();
  }
}

function pay() {
  log("DEBUG: [立即支付|极速支付]-" + (countP + 1) + "开始");
  let submitBtn = textMatches(/(立即支付|极速支付)/).findOne(300);
  // 虽然名字叫做 [立即支付], 其实还是只是[提交订单]的效果
  if (submitBtn) {
    log("进入条件4: [%s]", submitBtn.text());
    // 这里是高峰期的核心操作
    try {
      // 22/05/02 10次662毫秒,一分钟返回一次
      let tempFailed = false;
      let notAllowSleep = rendom(500, 1000);
      console.warn("尝试解决[不符合活动规则]问题, 等待[%s]ms", notAllowSleep);
      sleep(notAllowSleep);
      while (submitBtn && !tempFailed) {
        countP++;
        if (countP % 300 == 0) {
          musicNotify("01.submit");
          toastLog("本轮[立即支付]已执行[" + countP + "]次");
        }
        // 22/05/23 1900次大约2分钟, 返回以后再提交也很快就能进入
        // 22/05/28 1000次大约 64.2s
        if (countP % 700 == 0) {
          // 05/10 按照目前的逻辑, 缺货的情况下, 可以点击[继续支付], 所以也不太需要返回购物车了
          // 05/29 缺货的情况下, 又不能[继续支付]了, 需要返回购物车
          click_i_know();
          tempFailed = true;
          toastLog(
            "本轮执行[" + countP + "]次,可能部分商品已经失效, 执行[返回]"
          );
          // TODO 05/09 尝试尽快返回
          while (text("提交订单").exists()) {
            backInSubmit();
          }
          sleep(500);
        } else {
          // 05/18 两种点击方式都进行尝试
          // if (countP % 2 != 2) {
          submitBtn.parent().click();
          // } else {
          //   // 这种方式屏幕会置灰
          //   clickByCoorNoWait(submitBtn);
          // }
          //console.time("into_confirm_order-" + countP + "耗时"); //50ms左右
          // 前方拥堵.*| 不在需要判断
          // 05/18 增加 返回购物车 判断
          // 05/19 [返回购物车] 与 [继续支付] 的判断会冲突, 不会再命中 [继续支付]
          let confirmTxt = textMatches(
            /(确认订单|我知道了|返回购物车|我常买|继续支付|去支付|验证指纹|支付中|免密支付|确认支付|支付成功|支付订单)/
          ).findOnce();
          // 成功情况1: [支付中] - [支付订单] - [免密支付]
          //console.timeEnd("into_confirm_order-" + countP + "耗时");
          if (confirmTxt) {
            // console.log(
            //   "点击[立即支付|极速支付]后,进入条件3:" + confirmTxt.text()
            // );
            if (confirmTxt.text() == "我知道了") {
              tempFailed = true;
              // 抱歉，本次购买不符合活动规则
              let infoTxt = textMatches(
                ".*(不符合活动规则|重新选择送达时段)"
              ).findOnce();
              // 0503 出现[我知道了], 表示这次就失败了, 需要返回购物车重试
              sleep(500);
              clickByCoor(confirmTxt);
              if (infoTxt) {
                log("[我知道了]的原因[%s]", infoTxt.text());
                // 本次购买不符合活动规则, 这种情况下, 不会自动返回, 额外多等待一会
                log("第[%s]次,执行[返回]操作", countP);
                while (text("提交订单").exists()) {
                  backInSubmit();
                }
              } else {
                printReason(confirmTxt);
                // 下单失败
                // |导致下单失败.|.*该商品*
                // 05/06 抱歉, ***商品仅剩1件, 已为您调整为库存量~ (这种情况会自动返回)
                click_i_know();
                console.error("其他原因导致的[我知道了]");
              }
              //commonWait();
              //sleep(300);
            } else if (confirmTxt.text().indexOf("前方拥堵") != -1) {
              // toast提示 盒马 当前购物高峰期人数较多, 请稍后重试
              // toast提示 美团 [前方拥堵，请稍后再试] , 会自动消失可以不用管
              // log("通过text查找到[%s],忽略", confirmTxt.text()); // 日志太多,选择关闭 22/05/02
            } else if (
              confirmTxt.text().indexOf("继续支付") != -1 ||
              confirmTxt.text() == "返回购物车"
            ) {
              // [以下商品缺货了] - [以下商品数量发生变化] - [返回购物车] - [继续支付]
              if (text("继续支付").exists()) {
                console.info("有商品缺货了");
                // 说明请求服务器成功, 重置提交次数
                countP = 0;
                printPageUIObject();
                let tempI = 0;
                while (text("继续支付").exists() && tempI < 10) {
                  tempI++;
                  console.info("第%s次点击[继续支付]", tempI);
                  clickByCoor(confirmTxt);
                }
              } else {
                // 没有出现 [继续支付] 的场景下
                printReason(confirmTxt);
                tempFailed = true;
                sleep(500);
                clickByCoor(confirmTxt);
              }
            } else {
              log("进入条件5:", confirmTxt.text());
              // 支付订单|确认订单|我常买 这两个页面,交给后续流程处理
            }
          } else {
            //console.error("ERROR5: 既没有[确认订单], 也没有[我知道了]等按钮");
            //musicNotify("09.error");
            //back();
            //commonWait();
          }
        }

        submitBtn = textMatches(/(立即支付|极速支付)/).findOnce();
      }
      log("已经往下流转, 本次结果是否成功:", !tempFailed);
      if (!tempFailed) {
        // 没有失败的情况下, 正常应该进入 [去支付] 的过渡页面
        // 11:56:52.056 - 11:56:54.767 com.meituan.retail.v.android:id/cashier_tv_toast_info
        // 11:56:55.650 - 11:56:56.150 com.meituan.retail.v.android:id/neohybrid_loading_container
        // 11:56:56.301com.meituan.retail.v.android:id/mil_container
        // 11:56:56.450 支付成功
        console.info("等待[去支付]过渡页面结束");
        textMatches("免密支付|支付成功|支付订单|我常买").findOne(5 * 1000);
      }
    } catch (e) {
      console.error(e);
      console.error(e.stack);
    }
  } else {
    console.error("ERROR8: 没有找到[立即支付|极速支付]按钮");
    musicNotify("09.error");
  }
  log("DEBUG: [立即支付|极速支付]-%s结束", countP);
}

// 05/03 在三星S8上面, 这一步好像省略掉了, 直接选择[极速付款], 版本5.33.1, Android 9
// 05/04 在三星Note9上还是有这个步骤, 没有极速支付, 版本5.33.1, Android 10
function confirm_to_pay() {
  log("选择时间计数清零");
  countT = 1;
  countP = 0;
  log("DEBUG: [免密支付]-" + count + "开始");
  click_i_know();
  let payBtn = textMatches("(免密支付|确认支付)").findOne(2000);
  if (payBtn) {
    log("订单已提交成功, 进入支付环节");
    // 15分钟内支付即可, 为了防止误操作, 30秒之后点击付款
    let totalTime = 20 / (2 * SECOND_PER_TIME);
    for (let i = 0; i < totalTime; i++) {
      toastLog(
        (totalTime - i) * SECOND_PER_TIME * 2 +
          "秒之后点击[" +
          payBtn.text() +
          "]"
      );
      musicNotify("02.pay");
      sleep(SECOND_PER_TIME * 2 * 1000);
    }
    clickByCoor(payBtn);
    sleep(5000);
  } else {
    log("下单失败, 马上重试");
    sleep(1500);
    back();
  }
  log("DEBUG: [免密支付]结束");
}

function commonWait() {
  sleep(random(1, 50));
  if (text("前方拥堵，请稍后再试").findOne(COMMON_SLEEP_TIME_IN_MILLS)) {
    log("前方拥堵，请稍后再试");
  }
}

function click_i_know(iKnow) {
  let isIKnowExist = false;
  let retry_button = iKnow;
  if (retry_button == null) {
    // 只要页面有 我知道了等按钮, 都盲点
    retry_button = textMatches(/(我知道了|返回购物车|确定)/).findOnce();
  }
  if (retry_button) {
    isIKnowExist = true;
    //log("通用方法:找到[" + retry_button.text() + "]按钮,直接点击");
    clickByCoor(retry_button);
  } else {
    isIKnowExist = false;
  }
  return isIKnowExist;
}

// ################# 以下为通用方法 ################################################################################################
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
    sleep(2000);
    log("执行返回9");
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
  var timeMin = 250;
  var timeMax = 300;
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
  if (!isRecording && activeRecord == 1) {
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
      log("没有找到[开启录屏]按钮");
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
    // Note920U 录屏工具,已开启。,按钮
    // Note9 录屏工具,关闭。,按钮
    // S8 录制屏幕,开启。,按钮
    let startRecBtn = descMatches("(录屏工具|录制屏幕).*开启.*").findOne(3000);
    if (startRecBtn) {
      log("找到[关闭录屏]按钮: ", startRecBtn.desc());
      if (startRecBtn.desc().indexOf("录屏工具") != -1) {
        // Note9
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
  press(loc.centerX(), loc.centerY(), 10);
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
    commonWait();
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

function scrollUpInCart() {
  randomSwipe(
    getWidth() / 2,
    random(300, 400),
    getWidth() / 2,
    random(1500, 1600)
  );
}

function scrollDownInCart() {
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
