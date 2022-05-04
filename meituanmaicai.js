// 常量定义
const APP_NAME = "美团买菜";
const PACKAGE_NAME = "com.meituan.retail.v.android";
const AUTO_JS_PACKAGE_NAME = "com.taobao.idlefish.x";
// 最大尝试轮数
const MAX_ROUND = 10;
// 每轮最长重试次数 (平均单次1.2秒)
const MAX_TIMES_PER_ROUND = 500;
// 是否启用 结算 功能, 0:不启用, 1:启用
const ACTIVE_SUBMIT = 1;
// 点击按钮之后的通用等待时间
const COMMON_SLEEP_TIME_IN_MILLS = 150;
// 是否先强行停止APP
const ACTIVE_STOP_APP = 0;

// 第几轮
var round = 0;
// 本轮执行第几次
var count = 0;
// 选择时间本轮选择第几次 (220501, 目前时间已经会自动选择, 所以这个值已经暂时没有用处了)
var countT = 0;
// 立即支付尝试了第几次 (220501, 现在抢菜主要就是一直点这个按钮)
var countP = 0;
// 确认已失败
var isFailed = false;
// 确实已成功
var isSuccessed = false;

// 任务中断次数
var interruptCount = 0;

// 调试期间临时使用, 关闭其他脚本
engines.all().map((ScriptEngine) => {
  log("engines.myEngine().toString():" + engines.myEngine().toString());
  if (engines.myEngine().toString() !== ScriptEngine.toString()) {
    ScriptEngine.forceStop();
  }
});

auto.waitFor();
device.wakeUp();
commonWait();
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

  let randomSleep = random(3, 20);
  let secondPerTime = 3;
  for (let i = 0; i < randomSleep; i++) {
    toastLog(
      "第" +
        round +
        "轮抢菜执行结束, 等待" +
        (randomSleep * secondPerTime - i * secondPerTime) +
        "秒后继续"
    );
    sleep(secondPerTime * 1000);
  }
}
log("程序正常结束");

function start() {
  count = 0;
  isFailed = false;
  isSuccessed = false;
  if (ACTIVE_STOP_APP == 1) {
    kill_app(APP_NAME);
  }
  launchApp(APP_NAME);
  commonWait();
  if (ACTIVE_STOP_APP == 1) {
    sleep(3000);
    //跳过开屏广告
    btn_skip = id("btn_skip").findOne(2000);
    if (btn_skip) {
      btn_skip.click();
      toast("已跳过开屏广告");
      commonWait();
    } else {
      log("没有找到跳过开屏广告按钮");
    }
  }
  sleep(600);
  count = 0;
  while (count < MAX_TIMES_PER_ROUND && !isFailed && !isSuccessed) {
    // 1. 首页 [搜索] 当前位置只可自提
    // 2. 购物车 [我常买]
    // 3. 提交订单 [提交订单, 自提时间, 送达时间, 立即支付]
    // 4. 支付订单 [支付订单,免密支付], 完成
    // 5. 订单详情 [订单详情]
    // toast提示 [前方拥堵，请稍后再试] , 会自动消失可以不用管
    console.time("判断当前页面耗时");
    let page = textMatches(
      /(我知道了|返回购物车|搜索|我常买|提交订单|支付订单|验证指纹|订单详情|加入购物车|全部订单|请确认地址|支付成功|搜索|困鱼|日志)/
    ).findOne(2000);
    console.timeEnd("判断当前页面耗时");
    if (page) {
      log("进入条件1:[" + page.text() + "]");
      if (page.text() == "我常买") {
        // 购物车
        doInItemSel();
      } else if (page.text() == "搜索") {
        // 首页
        doInHome();
      } else if (page.text() == "请确认地址") {
        confirmAddress();
      } else if (page.text() == "提交订单") {
        // 提交订单
        doInSubmit();
      } else if (page.text() == "支付订单" || page.text() == "验证指纹") {
        // 支付订单
        doInPay();
      } else if (page.text() == "订单详情" || page.text() == "支付成功") {
        // 支付详情
        doInPaySuccess();
      } else if (
        page.text() == "加入购物车" ||
        page.text() == "全部订单" ||
        page.text() == "搜索"
      ) {
        // 商品详情页, 跳转至购物车
        // 首页/分类/我的页面
        to_mall_cart();
      } else if (page.text() == "我知道了" || page.text() == "返回购物车") {
        // 系统提示, 点掉即可
        printReason(page);
        click_i_know();
      } else if (page.text() == "困鱼" || page.text() == "日志") {
        waitCheckLog();
      } else {
        console.error("ERROR3: 当前在其他页面");
        back();
        commonWait();
        launchApp(APP_NAME);
        commonWait();
      }
    } else {
      console.error("ERROR4: 未知页面");
      musicNotify("09.error");
      sleep(2000);
    }
    let packageName = currentPackage();
    if (packageName == PACKAGE_NAME || packageName == AUTO_JS_PACKAGE_NAME) {
      interruptCount = 0;
    } else {
      interruptCount++;
      log(
        "WANR: 页面已经被切至:" +
          packageName +
          ",当前第" +
          interruptCount +
          "次"
      );
      if (interruptCount == 24) {
        log("每2分钟重新启动一次[" + APP_NAME + "]");
        unlock();
        home();
        commonWait();
        launchApp(APP_NAME);
        commonWait();
      }
      //sleep(1000);
    }
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
}

function waitCheckLog() {
  //log("正在查看日志")
  sleep(3000);
}

function doInHome() {
  to_mall_cart();
}

function doInPay() {
  confirm_to_pay();
  musicNotify("02.pay");
}

function doInPaySuccess() {
  musicNotify("03.pay_success");
  isSuccessed = true;
  // 等待一定时间
  sleep(30 * 1000);
  // 返回购物车页面
  let returnBtn = text("完成").findOne(1000);
  if (returnBtn) {
    log("找到[%s]按钮", returnBtn.text());
    // clickByCoor(returnBtn);
    commonWait();
  } else {
    musicNotify("09.error");
    console.error("ERROR: 找不到[支付成功]的[完成]按钮");
    sleep(2000);
  }
}

// 220502 这个功能主要用于收货地址与定位地址距离较远的情况下, 选择[家]这个标签对应的地址,并[确认选择]
function confirmAddress() {
  let homeAddrBtn = text("家").findOne(1000);
  if (homeAddrBtn) {
    homeAddrBtn.parent().parent().click();
    commonWait();
    let confirmBtn = text("确认选择").findOne(100);
    if (confirmBtn) {
      confirmBtn.parent().click();
      commonWait();
    }
  } else {
    musicNotify("05.need_manual");
    sleep(3000);
  }
}

// 关闭闹钟提醒
function closeClock() {
  // 三星Note9闹钟关闭按钮
  let closeClockBtn = id(
    "com.sec.android.app.clockpackage:id/tabCircle"
  ).findOne(200);
  if (closeClockBtn) {
    console.info("识别到三星闹钟界面, 执行[返回]关闭闹钟");
    back();
    commonWait();
    sleep(500);
  } else {
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

// ################################################

function to_mall_cart() {
  if (textStartsWith("我常买").exists()) {
    log("当前已经在购物车页面");
  } else {
    shopping_cart_btn = idMatches(
      /.*(img_shopping_cart|cartredDotTextView).*/
    ).findOne(1000);
    if (shopping_cart_btn) {
      shopping_cart_btn.parent().click(); //btn上一级控件可点击
      //var loc = id("img_shopping_cart").findOne().bounds();//1.匹配id寻找位置。
      //click(loc.centerX(), loc.centerY());
      log("已进入购物车,等待购物车加载完成");
      commonWait();
      text("删除").findOne(2000);
    } else {
      console.error("ERROR6: 未找到购物车按钮");
    }
  }
}

function reload_mall_cart() {
  // 切换标签页面
  // log("重新加载购物车");
  randomSwipe(
    560 + random(0, 50),
    800 + random(0, 100),
    500 + random(0, 50),
    1500 + random(0, 100)
  );
  if (ACTIVE_SUBMIT == 1) {
    sleep(100, random(0, 1000));
  } else {
    sleep(5000, random(0, 5000));
  }
}

function doInItemSel() {
  countP = 0;
  countT = 0;
  // 220417 , 目前单次约2.5秒, 2小时约2880次
  if (count >= MAX_TIMES_PER_ROUND) {
    // 大约每半小时休息几分钟
    toastLog("本轮捡漏没有成功, 稍后重新开始");
    return;
  }
  count++;
  log("抢菜第" + round + "-" + count + "次");
  if (count == 1 || count % 5 == 0) {
    toast("抢菜第" + round + "轮第" + count + "次");
  }

  let submit_btn = textMatches("结算.*|重新加载").findOne(1000);
  if (!submit_btn) {
    log("未找到结算按钮，刷新页面");
    reload_mall_cart();
  } else {
    if (ACTIVE_SUBMIT == 0) {
      toastLog("观察模式, 仅监控商品");
    } else {
      if (submit_btn.text().indexOf("结算") != -1) {
        // 220501, 因为美团是整个购物车里面, 只要有一件商品售罄, 整个订单都会提交失败, 所以默认有商品就可以了, 不进行全选
        // check_all2();
        // 极端情况下, 商品秒无, 这个时候会没有结算按钮, 需要再次判断
        // 只是 "结算" 按钮的话, 并未选择商品, 只有出现 "结算(*)" 才是选中了 , 这种情况会出现在早上6点左右, 服务器繁忙的情况下
        if (submit_btn.text().indexOf("(") != -1) {
          log("点击->[" + submit_btn.text() + "]");
          submit_btn.parent().click(); //结算按钮点击
          // commonWait(); // 把一些打印日志的操作转移到点击之后的等待过程
          // 记录商品信息
          // let item = className("android.widget.TextView").depth(30).findOne(100);
          // if (item) {
          //   log("第一件商品:" + item.text());
          // }
          // 1. 配送运力已约满
          // 2. 门店已打烊
          // 3. 订单已约满 (这种情况可能会等比较长时间才返回)
          let nextBtn = textMatches(
            /(我知道了|返回购物车|立即支付|极速支付|[0-2]{1}\d:\d{2}-[0-2]{1}\d:\d{2})/
          ).findOne(5000);
          if (nextBtn) {
            if (
              nextBtn.text() == "我知道了" ||
              nextBtn.text() == "返回购物车"
            ) {
              console.time("点击->01[" + nextBtn.text() + "]耗时");
              printReason(nextBtn);
              nextBtn.parent().click();
              commonWait();
              console.timeEnd("点击->01[" + nextBtn.text() + "]耗时");
              // 这里必须要等待一定时长(>600), 否则下次结算一定概率会点击无效
              sleep(600);
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
            console.error("ERROR7: 未知情况");
            musicNotify("09.error");
            commonWait();
          }
        } else {
          // 没有选择商品的情况下, 进行全选
          check_all2();
          // 判断是否是 [站点闭店休息中,暂时无法下单]
          let ClosedTxt = textMatches(
            ".*本站点暂停线上服务.*|.*仅支持自提.*"
          ).findOne(100);
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

function check_all() {
  log("判断购物车是否已经选中商品");
  let radio_checkall = className("android.widget.ImageView")
    .depth(22)
    .findOne(200);
  if (radio_checkall) {
    // log(radio_checkall.findOne());
    // 选中的情况下是 结算(数量),
    // 220422 更新, 如果闭店的情况下, 就算全选了商品, 结算后面也不会出现"(数量)""
    let is_checked2 = textStartsWith("结算").findOne(200).text() != "结算";
    let is_checked = textMatches(/(.*配送费.*)/).findOne(200) != null;
    log(
      "购物车当前已选择商品, 结算条件:" +
        is_checked2 +
        ", 配送费条件: " +
        is_checked
    );
    // 自提的情况下, 已选择了商品 结算条件 true, 配送费条件 false
    if (!is_checked2 && !is_checked) {
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
      is_checked2 = textStartsWith("结算").findOne(200).text() != "结算";
      if (!is_checked2) {
        log("重新全选商品-再次点击全选按钮");
        radio_checkall.parent().click();
        commonWait();
        sleep(1000);
      }
      is_checked2 = textStartsWith("结算").findOne(200).text() != "结算";
      log("重新全选商品-购物车当前已选择商品:" + is_checked2);
    } else {
      log("购物车已经选择好了商品");
    }
  }
}

function check_all2() {
  // 先从底部购物车右上角查看all是多少
  let allNumber = id("img_shopping_cart")
    .findOne(5000)
    .parent()
    .child(1)
    .text();
  // 构造"结算(allNumber)"的字符串用于匹配
  let matchText = "结算(" + allNumber + ")";
  // 找到结算按钮的text
  let realText = textStartsWith("结算").findOne(200).text();
  // 如果两者不匹配，则没有全选中
  let allChecked = matchText === realText;
  if (!allChecked) {
    let radio_checkall = className("android.widget.ImageView")
      .depth(22)
      .findOne(200);
    radio_checkall.parent().click();
  }
}

function doInSubmit() {
  click_i_know();
  countT++;
  let timeTxt = className("android.widget.TextView")
    .depth(19)
    .textMatches(/([0-2]{1}\d:\d{2}-[0-2]{1}\d:\d{2})/)
    .findOne(500);
  if (timeTxt) {
    log("INFO 已选择时间:" + timeTxt.text());
    pay();
  } else {
    // 220501, 理论上, 现在应该不会进这段逻辑了
    let arriveTimeBtn = textStartsWith("送达时间").findOne(1000);
    if (arriveTimeBtn) {
      //选择送达时间
      arriveTimeBtn.parent().click();
      log("选择时间第" + round + "-" + countT + "次");
      if (countT == 1 || countT % 5 == 0) {
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
  }
}

function printReason(iKnow) {
  // [当前不在可下单时段] - [每日6:00开放下单, 当前时间无法下单, 感谢您的理解] - [我知道了]
  let needPrint = true;
  iKnow
    .parent()
    .parent()
    .parent()
    .find(textMatches(".+"))
    .forEach((child, idx) => {
      if (needPrint) {
        if (child.text() != "订单已约满") {
          log(
            "第" + (idx + 1) + "项(" + child.depth() + ")text:" + child.text()
          );
        } else {
          needPrint = false;
        }
      }
    });
}

function pay() {
  log("DEBUG: [立即支付|极速支付]-" + countP + "开始");
  let submitBtn = textMatches(/(立即支付|极速支付)/).findOne(1000);
  // 虽然名字叫做 [立即支付], 其实还是只是[提交订单]的效果
  if (submitBtn) {
    log("进入条件4: [%s]", submitBtn.text());
    // 这里是高峰期的核心操作
    try {
      // 22/05/02 10次662毫秒,一分钟返回一次
      let tempFailed = false;
      while (submitBtn && !tempFailed) {
        countP++;
        if (countP % 200 == 2) {
          musicNotify("01.submit");
          console.info("本轮[立即支付]已执行[%s]次", countP);
        }
        if (countP % 900 == 0) {
          tempFailed = true;
          console.info("本轮执行[%s]次,可能部分商品已经失效, [返回]", countP);
          sleep(2500);
          back();
          commonWait();
          sleep(300);
        } else {
          submitBtn.parent().click();
          //console.time("into_confirm_order-" + countP + "耗时"); //50ms左右
          let confirmTxt = textMatches(
            /(前方拥堵.*|确认订单|我知道了|我常买|去支付|验证指纹|支付中|免密支付|支付成功|支付订单)/
          ).findOne(5000);
          // 成功情况1: [支付中] - [支付订单] - [免密支付]
          //console.timeEnd("into_confirm_order-" + countP + "耗时");
          if (confirmTxt) {
            // console.log(
            //   "点击[立即支付|极速支付]后,进入条件3:" + confirmTxt.text()
            // );
            if (confirmTxt.text() == "我知道了") {
              printReason(confirmTxt);
              tempFailed = true;
              let infoTxt = textMatches(
                ".*(不符合活动规则|重新选择送达时段)"
              ).findOne(50);
              // 0503 出现[我知道了], 表示这次就失败了, 需要返回购物车重试
              sleep(1000);
              clickByCoor(confirmTxt);
              sleep(500);
              if (infoTxt) {
                log("[我知道了]的原因[%s]", infoTxt.text());
                // 本次购买不符合活动规则, 这种情况下, 不会自动返回, 额外多等待一会
                log("第[%s]次,执行[返回]操作", countP);
                back();
              } else {
                // |导致下单失败.|.*该商品*
                console.error("其他原因导致的[我知道了]");
              }
              commonWait();
              sleep(300);
            } else if (confirmTxt.text().indexOf("前方拥堵") != -1) {
              // toast提示 盒马 当前购物高峰期人数较多, 请稍后重试
              // toast提示 美团 [前方拥堵，请稍后再试] , 会自动消失可以不用管
              // log("通过text查找到[%s],忽略", confirmTxt.text()); // 日志太多,选择关闭 22/05/02
            } else {
              log("进入条件5:", confirmTxt.text());
              // 支付订单|确认订单|我常买 这两个页面,交给后续流程处理
            }
          } else {
            console.error("ERROR7: 既没有[确认订单], 也没有[我知道了]等按钮");
            musicNotify("09.error");
            //back();
            //commonWait();
          }
        }
        submitBtn = textMatches(/(立即支付|极速支付)/).findOne(100);
      }
      log("已经往下流转, 本次失败:", tempFailed);
    } catch (e) {
      console.error(e);
      console.error(e.stack);
    }
  } else {
    console.error("ERROR8: 没有找到[立即支付|极速支付]按钮");
    musicNotify("09.error");
  }
  log("DEBUG: [立即支付|极速支付]结束,countP: ", countP);
}

// 05/03 在三星S8上面, 这一步好像省略掉了, 直接选择[极速付款], 版本5.33.1, Android 9
// 05/04 在三星Note9上还是有这个步骤, 没有极速支付, 版本5.33.1, Android 10
function confirm_to_pay() {
  log("选择时间计数清零");
  countT = 0;
  countP = 0;
  log("DEBUG: [免密支付]-" + count + "开始");
  click_i_know();
  let payBtn = textStartsWith("免密支付").findOne(2000);
  if (payBtn) {
    toastLog("已确认支付成功, 播放音乐");
    musicNotify();
    // 15分钟内支付即可, 为了防止误操作, 1分钟之后点击付款
    sleep(60 * 1000);
    clickByCoor(payBtn);
    sleep(5000);
  } else {
    log("下单失败, 马上重试");
    sleep(1500);
    back();
  }
  log("DEBUG: [免密支付]结束");
}

function musicNotify(name) {
  if (name == null) {
    name = "success";
  }
  let m = "/storage/emulated/0/Download/" + name + ".mp3";
  console.time("music[" + name + "] 耗时");
  try {
    if (!files.exists(m)) {
      // 如果无法访问, 大概耗时2.5s, 将来准备换成公网地址
      var res = http.get(
        "http://192.168.6.16/apk/autojs/tts/Download/" + name + ".mp3"
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

function commonWait() {
  sleep(random(1, 50));
  if (text("前方拥堵，请稍后再试").findOne(COMMON_SLEEP_TIME_IN_MILLS)) {
    log("前方拥堵，请稍后再试");
  }
}

function click_i_know(iKnow) {
  let retry_button = iKnow;
  if (retry_button == null) {
    // 只要页面有 我知道了等按钮, 都盲点
    retry_button = textMatches(/(我知道了|返回购物车)/).findOne(100);
  }
  if (retry_button) {
    log("通用方法:找到[" + retry_button.text() + "]按钮,直接点击");
    clickByCoor(retry_button);
  }
}

function clickByCoor(obj) {
  let loc = obj.bounds();
  log(
    "通过坐标点击(" +
      obj.text() +
      "):[" +
      loc.centerX() +
      "," +
      loc.centerY() +
      "]"
  );
  click(loc.centerX(), loc.centerY());
  commonWait();
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
    sleep(3000);
    back();
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
  //设置随机滑动时长范围
  var timeMin = 150;
  var timeMax = 400;
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
