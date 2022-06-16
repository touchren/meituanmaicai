const REPO = "/touchren/meituanmaicai";
const BRANCH = "main";

let { updateByHttp } = require("./Utils.js");

updateByHttp(REPO, BRANCH);
