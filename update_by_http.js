const REPO = "/touchren/meituanmaicai";
const BRANCH = "main";
const PATH = "";

const CONTEXT_URLS = [
  "https://ghproxy.futils.com/https://github.com" +
    REPO +
    "/blob/" +
    BRANCH +
    "/",
  "https://cdn.staticaly.com/gh" + REPO + "/" + BRANCH + "/",
  //"https://raw.xn--gzu630h.xn--kpry57d"+REPO+"/"+BRANCH+"/",
  "https://raw.githubusercontents.com" + REPO + "/" + BRANCH + "/",
  //"https://gcore.jsdelivr.net/gh"+REPO+"@"+BRANCH+"/",
  "https://fastly.jsdelivr.net/gh" + REPO + "@" + BRANCH + "/",
  "https://ghproxy.com/https://raw.githubusercontent.com" +
    REPO +
    "/" +
    BRANCH +
    "/",
  "https://raw.iqiq.io" + REPO + "/" + BRANCH + "/",
  //"https://raw.githubusercontent.com"+REPO+"/"+BRANCH+"/",
];

auto.waitFor();
console.setGlobalLogConfig({
  file:
    "/storage/emulated/0/脚本/logs/console-" +
    new Date().getMonth() +
    +new Date().getDate() +
    ".log",
});

let { getProjectConfig } = require("./Utils.js");

for (i = 0; i < 3; i++) {
  log("等待%s秒后开始", 3 - i);
  sleep(1 * 1000);
}

let project = getProjectConfig();
log("project.assets", project.assets);
if (project.assets) {
  let folder = engines.myEngine().cwd() + "/";
  log("开始获取远程脚本, 保存路径: ", folder);
  project.assets.forEach((file, index) => {
    let downloadSuccess = false;
    CONTEXT_URLS.forEach((context_url, i) => {
      if (!downloadSuccess) {
        let url = context_url + file;
        console.time(
          "脚本" + (index + 1) + "[" + url + "]第" + (i + 1) + "次更新: 耗时"
        );
        var res_script = {};
        try {
          res_script = http.get(url, {
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
        console.timeEnd(
          "脚本" + (index + 1) + "[" + url + "]第" + (i + 1) + "次更新: 耗时"
        );
        if (res_script.statusCode == 200) {
          let updateFile = folder + file;
          log("保存文件路径:", updateFile);
          files.writeBytes(updateFile, res_script.body.bytes());
          downloadSuccess = true;
          toastLog("脚本" + file + "更新成功");
          return;
        } else {
          toastLog(
            "脚本获取失败！这可能是您的网络原因造成的，建议您检查网络后再重新运行软件吧\nHTTP状态码:" +
              res_script.statusMessage
          );
        }
      }
    });
  });
} else {
  toastLog("无法获取配置文件, 更新失败");
}
