// eval(
//   http
//     .get(
//       "https://js.dayplus.xyz/https://raw.githubusercontent.com/touchren/meituanmaicai/main/meituanmaicai.js"
//     )
//     .body.string()
// );
// https://raw.githubusercontent.com/touchren/meituanmaicai/main/meituanmaicai.js
// https://raw.fastgit.org/touchren/meituanmaicai/main/meituanmaicai.js
// https://gpproxy.com/https://raw.githubusercontent.com/touchren/meituanmaicai/main/meituanmaicai.js
// https://js.dayplus.xyz/https://raw.githubusercontent.com/touchren/meituanmaicai/main/meituanmaicai.js

// //用于在线获取脚本，省去了不停更新软件的烦恼，也方便我更新
// var url =
//   "https://code.aliyun.com/orange_shirt/OrangeJs/raw/master/APPurl/ScriptUrl";
// //脚本网址
// //中间一般这样跳转,比如 网站/目录/脚本.js
// var res = http.get(url, {
//   headers: {
//     "Accept-Language": "en-us,en;q=0.5",
//     "User-Agent":
//       "Mozilla/5.0(Macintosh;IntelMacOSX10_7_0)AppleWebKit/535.11(KHTML,likeGecko)Chrome/17.0.963.56Safari/535.11",
//   },
// });
// if (res.statusCode == 200) {
//   toastLog("脚本网址请求成功");
//   context_url = res.body.string();
//   console.info(context_url);
// } else {
//   toastLog("脚本网址请求出错:" + res.statusMessage + "\n备用脚本网址重试中……");
//   var url =
//     "https://code.aliyun.com/orange_shirt/OrangeJs/raw/master/APPurl/ScriptUrl_backup"; //备用脚本网址
//   var res = http.get(url, {
//     headers: {
//       "Accept-Language": "en-us,en;q=0.5",
//       "User-Agent":
//         "Mozilla/5.0(Macintosh;IntelMacOSX10_7_0)AppleWebKit/535.11(KHTML,likeGecko)Chrome/17.0.963.56Safari/535.11",
//     },
//   });
//   if (res.statusCode == 200) {
//     toastLog("备用脚本网址请求成功");
//     context_url = res.body.string();
//     console.info(context_url);
//   } else {
//     toastLog(
//       "备用脚本网址，同样请求出错！这可能是您的网络原因造成的，建议您检查网络后再重新运行软件吧\nHTTP状态码:" +
//         res.statusMessage
//     );
//   }
// }

const REPO = "/touchren/meituanmaicai";
const BRANCH = "main";
const PATH = "meituanmaicai";

const CONTEXT_URLS = [  
  "https://ghproxy.futils.com/https://github.com/touchren/meituanmaicai/blob/main/meituanmaicai.js",
  "https://cdn.staticaly.com/gh/touchren/meituanmaicai/main/meituanmaicai.js",
  //"https://raw.xn--gzu630h.xn--kpry57d/touchren/meituanmaicai/main/meituanmaicai.js",
  "https://raw.githubusercontents.com/touchren/meituanmaicai/main/meituanmaicai.js",
  //"https://gcore.jsdelivr.net/gh/touchren/meituanmaicai@main/meituanmaicai.js",
  "https://fastly.jsdelivr.net/gh/touchren/meituanmaicai@main/meituanmaicai.js",
  "https://ghproxy.com/https://raw.githubusercontent.com/touchren/meituanmaicai/main/meituanmaicai.js",
  "https://raw.iqiq.io/touchren/meituanmaicai/main/meituanmaicai.js",
  //"https://raw.githubusercontent.com/touchren/meituanmaicai/main/meituanmaicai.js",
];

auto.waitFor();
console.setGlobalLogConfig({
  file:
    "/storage/emulated/0/脚本/logs/console-" +
    new Date().getMonth() +
    +new Date().getDate() +
    ".log",
});

for (i = 0; i < 3; i++) {
  log("等待%s秒后开始", 3 - i);
  sleep(1 * 1000);
}

log("开始获取远程脚本");
let downloadSuccess = false;
CONTEXT_URLS.forEach((context_url, i) => {
  if (!downloadSuccess) {
    console.time("脚本" + (i + 1) + ": [" + context_url + "]耗时");
    var res_script = {};
    try {
      res_script = http.get(context_url, {
        headers: {
          "Accept-Language": "en-us,en;q=0.5",
          "User-Agent":
            "Mozilla/5.0(Macintosh;IntelMacOSX10_7_0)AppleWebKit/535.11(KHTML,likeGecko)Chrome/17.0.963.56Safari/535.11",
        },
      });
    } catch (e) {
      log("下载远程脚本异常: ", e);
      log(e.stack);
    }
    console.timeEnd("脚本" + (i + 1) + ": [" + context_url + "]耗时");
    if (res_script.statusCode == 200) {
      // toastLog("脚本获取成功");
      downloadSuccess = true;
      var js = res_script.body.string();
      engines.execScript(PATH, js);
      return;
    } else {
      toastLog(
        "脚本获取失败！这可能是您的网络原因造成的，建议您检查网络后再重新运行软件吧\nHTTP状态码:" +
          res_script.statusMessage
      );
    }
  }
});
if (!downloadSuccess) {
  console.warn("所有远程脚本下载失败, 执行本地文件");
  engines.execScriptFile("meituanmaicai.js");
}
