# 美团抢菜捡漏助手(上海专用)
此脚本只是用来保护脆弱的手指, 并不能提高早上6点的时候抢菜的成功率, 但是睡眠质量应该还是能提高一点的, 同时家庭也能和睦一些 o(*￣▽￣*)ブ

## 食用建议
1. 商品需要先添加购物车, 晚上23点左右开始到第二天5点多会有商品上架添加购物车, 其他时间也会上架, 但是基本上都是秒光
2. 商品添加到购物车之后, 建议取消勾选, 不要选择任何商品, 程序会自动全选所有商品
3. 出现`免密支付`按钮之后开始播放音乐提醒, 1分钟之后将**自动点击**, 如果不需要可以在期间按`音量+`停止脚本
4. 抢菜成功后, 几分钟之后会再次开始, 最多5轮

### 补充说明
1. 在手机`/Download`目录下放置一首`success.mp3`的歌曲(完整路径: `/storage/emulated/0/Download/success.mp3`), 抢单成功的时候会播放音乐提醒, **请在15分钟内完成支付**
2. 按`音量+`键手工停止脚本
3. 如果需要自动解锁, 修改 Unlock.js 里面的 password , 支持滑动解锁, 密码解锁

## 修改说明
* 在`zgl018`脚本(自动下单)的基础上, 主要增加了捡漏的功能, 其他细节进行了优化
* 仅支持Android, 适配`美团买菜 5.33.1`, 需要在`Auto.js.Modify` 下运行, 建议使用[困鱼], [https://github.com/TonyJiangWJ/Auto.js]
* 适配机型: 三星Note9(Android 10), 三星S8(Android 9)

调试及使用教程可参考: https://github.com/qulingyuan/robVeg

## 参考代码
* 下拉刷新代码参考 https://www.d1blog.com/autojs/1752.html
* 核心代码来自 https://gist.github.com/zgl018/742b661edd2902e80db4bfca59d01e1a

## 已知问题
* ~~到了支付页面不会自动点击`立即支付`~~
* ~~高峰期程序有时候会卡住不动(每天6点优化中)~~
* ~~是否购物车是否已经全选有问题, 一直返回未选中(实际貌似点击后也不会取消全选)~~
* ~~选择时间,点击`立即支付`之后, 拥堵情况下会导致程序卡住~~

# 更新记录
### 22/05/04
* 完善付款后判断逻辑

### 22/05/03
* 优化高峰期抢菜逻辑
* 查看日志时暂停任务执行

### 22/05/02
* 通过手工设置提前1分钟的闹钟唤醒手机来解决定时任务问题
* 帮朋友抢菜的情况下, 自动确认[家]对应的地址

### 22/05/01
* 改善高峰期抢菜性能

### 22/04/30
* 增加自动解锁功能

### 22/04/27
* [站点已关闭]和[仅支持自提]的情况下都停止本轮任务

### 22/04/26
* 修复[首页]的判断逻辑
* 修复[提交订单]页面出现的空指针问题
* 优化[全选]的逻辑(使用Utopia-Zzzz提供的代码)
* [我知道了]等异常信息按钮统一使用坐标点击

### 22/04/25
* 把之前的面向过程编码重构为面向对象的方式, 能够兼容更多不确定情况, 支持从中间状态继续执行程序

### 22/04/24
* 选择时间兼容高峰期情况
* 支付成功后自动返回购物车
* 进入[站点自提]页面时跳过本轮任务
* 打上标签v0.1

### 22/04/23
* 自提场景的监控, 这种情况和闭店类似, 也不需要尝试了, 现象上来说, 不会出现`配送费`字样
* 全选购物车商品兼容自提场景
* 选择时间点击不生效的问题修复

### 22/04/22
* 捡漏时,有时候出现可选择时间, 但其实只是缓存或者已经秒无的情况下, 进行容错处理
* 优化全选商品的逻辑(每轮第一次的时候进行全选)
* 计次改成全局变量count
* 为了帮别人刷单, 默认不再强制结束程序, 需要先选好地址以后不关闭程序
* 增加[站点闭店休息中]判断
* 增加卡在结算等页面的容错处理
* 增加异常捕获, 发生异常的情况下, 该轮结束后马上开始下一轮

### 22/04/21
* 继续解决高峰期程序卡住的问题(基本上都是findOne没有设置超时导致的)
* 优化性能, 把sleep固定的时长调整为等待按钮出现
* 兼容英文系统(FORCE STOP)

### 22/04/20
* 立即支付页面增加重试机制
* 全选商品失败增加容错机制

### 22/04/19
* 已启用自动点击免密支付, 已启用自动点击免密支付, 已启用自动点击免密支付 (出现`免密支付`按钮之后开始播放音乐提醒, 1分钟之后点击支付, 如果不需要期间可按`音量+`停止脚本)
* 捡漏成功之后, 休息3分钟左右, 会重新开始捡漏, 最多持续5轮
* 刷新购物车的滑动点位使用随机数

### 22/04/18
* 结算, 选择时间, 立即支付都增加容错逻辑
* 全选商品, 刚好碰到商品又没有了的情况, 进行容错处理
* 增加第一件商品的日志打印, 没抢到的情况下可以知道自己错过了什么好东西...
* 修复调用2000余次出现的内存溢出导致程序中断的问题

### 22/04/17
* 抢单成功的提醒音乐名称修改为success.mp3
* 立即支付增加重试机制
* 通过结算按钮文字判断是否已选择商品
* 单次捡漏最多执行约2小时

### 22/04/16
* 在结算前先全选商品
* 修复不会点击`立即支付`的问题
