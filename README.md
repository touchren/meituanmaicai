# meituanmaicai
美团买菜Autojs,在自动下单的基础上,增加捡漏的功能

使用教程可参考: https://github.com/qulingyuan/robVeg

补充说明:
1. 在手机`/Download`目录下放置一首`success.mp3`的歌曲(完整路径: `/storage/emulated/0/Download/success.mp3`), 抢单成功的时候会播放音乐提醒, **15分钟内支持**
2. 按`音量+`键手工停止脚本


参考代码:
* autojs教程 http://keep.ipromiseyourlife.com/2019/06/27/auto-js%E7%9A%84%E4%BD%BF%E7%94%A8%E4%BB%A5%E5%8F%8A%E8%96%85%E8%85%BE%E8%AE%AF%E7%BE%8A%E6%AF%9B%E6%8F%92%E4%BB%B6%E7%A4%BA%E4%BE%8B/
* 下拉刷新代码参考 https://www.d1blog.com/autojs/1752.html
* 核心代码来自 https://gist.github.com/zgl018/742b661edd2902e80db4bfca59d01e1a

已知问题:
* ~~到了支付页面不会自动点击`立即支付`~~
* 高峰期程序有时候会卡住不动
* ~~是否购物车是否已经全选有问题, 一直返回未选中(实际貌似点击后也不会取消全选)~~

# 更新记录

### 22/04/16
* 在结算前先全选商品
* 修复不会点击`立即支付`的问题

### 22/04/17
* 抢单成功的提醒音乐名称修改为success.mp3
* 立即支付增加重试机制
* 通过结算按钮文字判断是否已选择商品