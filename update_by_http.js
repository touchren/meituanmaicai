const REPO = "/touchren/meituanmaicai";
const BRANCH = "main";

let {
  getProjectConfig,  
  downloadFromGithub,
} = require("./Utils.js");

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
    let res_script = downloadFromGithub(REPO, BRANCH, file);
    if (res_script) {
      let updateFile = folder + file;
      log("保存文件路径:", updateFile);
      files.writeBytes(updateFile, res_script.body.bytes());
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
