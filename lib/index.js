"use strict";
var __awaiter = (this && this.__awaiter) || function (thisArg, _arguments, P, generator) {
    function adopt(value) { return value instanceof P ? value : new P(function (resolve) { resolve(value); }); }
    return new (P || (P = Promise))(function (resolve, reject) {
        function fulfilled(value) { try { step(generator.next(value)); } catch (e) { reject(e); } }
        function rejected(value) { try { step(generator["throw"](value)); } catch (e) { reject(e); } }
        function step(result) { result.done ? resolve(result.value) : adopt(result.value).then(fulfilled, rejected); }
        step((generator = generator.apply(thisArg, _arguments || [])).next());
    });
};
var __generator = (this && this.__generator) || function (thisArg, body) {
    var _ = { label: 0, sent: function() { if (t[0] & 1) throw t[1]; return t[1]; }, trys: [], ops: [] }, f, y, t, g;
    return g = { next: verb(0), "throw": verb(1), "return": verb(2) }, typeof Symbol === "function" && (g[Symbol.iterator] = function() { return this; }), g;
    function verb(n) { return function (v) { return step([n, v]); }; }
    function step(op) {
        if (f) throw new TypeError("Generator is already executing.");
        while (g && (g = 0, op[0] && (_ = 0)), _) try {
            if (f = 1, y && (t = op[0] & 2 ? y["return"] : op[0] ? y["throw"] || ((t = y["return"]) && t.call(y), 0) : y.next) && !(t = t.call(y, op[1])).done) return t;
            if (y = 0, t) op = [op[0] & 2, t.value];
            switch (op[0]) {
                case 0: case 1: t = op; break;
                case 4: _.label++; return { value: op[1], done: false };
                case 5: _.label++; y = op[1]; op = [0]; continue;
                case 7: op = _.ops.pop(); _.trys.pop(); continue;
                default:
                    if (!(t = _.trys, t = t.length > 0 && t[t.length - 1]) && (op[0] === 6 || op[0] === 2)) { _ = 0; continue; }
                    if (op[0] === 3 && (!t || (op[1] > t[0] && op[1] < t[3]))) { _.label = op[1]; break; }
                    if (op[0] === 6 && _.label < t[1]) { _.label = t[1]; t = op; break; }
                    if (t && _.label < t[2]) { _.label = t[2]; _.ops.push(op); break; }
                    if (t[2]) _.ops.pop();
                    _.trys.pop(); continue;
            }
            op = body.call(thisArg, _);
        } catch (e) { op = [6, e]; y = 0; } finally { f = t = 0; }
        if (op[0] & 5) throw op[1]; return { value: op[0] ? op[1] : void 0, done: true };
    }
};
Object.defineProperty(exports, "__esModule", { value: true });
var axios_1 = require("axios");
var xml2js_1 = require("xml2js");
var cheerio_1 = require("cheerio");
var fs_1 = require("fs");
var node_downloader_helper_1 = require("node-downloader-helper");
var fs = require("fs");
var dotnet = require("dotenv");
dotnet.config();
var config = {
    site: process.env.SITE,
    type: process.env.TYPE,
    size: Number(process.env.SIZE),
    start: Number(process.env.START),
    directory: process.env.DIRECTORY,
};
var TOTAL_POSTS = 0;
var filesInDirectory = [];
var getData = function (site, type, size, start) { return __awaiter(void 0, void 0, void 0, function () {
    var _endPoint;
    return __generator(this, function (_a) {
        _endPoint = "https://".concat(site, ".tumblr.com/api/read?type=").concat(type, "&num=").concat(size, "&start=").concat(start);
        return [2 /*return*/, axios_1.default
                .get(_endPoint)
                .then(function (res) { return res.data; })
                .then(function (res) {
                var data;
                (0, xml2js_1.parseString)(res, function (_err, results) {
                    data = JSON.parse(JSON.stringify(results));
                    TOTAL_POSTS = Number(data.tumblr.posts[0]["$"].total);
                });
                return data;
            })
                .catch(function (_err) {
                console.log("Page not found!");
                process.exit(1);
            })];
    });
}); };
/**
 * Get all media links from a tumblr account.
 *
 * @param site Tumblr account
 * @param type video/photo
 * @param size Number of data per cycle
 * @param start Initial start
 * @returns Promise with a List of media links
 */
var getMediaLinks = function (site, type, size, start) { return __awaiter(void 0, void 0, void 0, function () {
    var mediaLinks, data;
    return __generator(this, function (_a) {
        switch (_a.label) {
            case 0:
                mediaLinks = [];
                return [4 /*yield*/, getData(site, type, size, start).then(function (res) { return res; })];
            case 1:
                data = _a.sent();
                start;
                _a.label = 2;
            case 2:
                if (!(start < TOTAL_POSTS)) return [3 /*break*/, 5];
                data.tumblr.posts[0].post.map(function (post) {
                    switch (type) {
                        case "video":
                            var htmlData = void 0;
                            try {
                                htmlData = post["regular-body"][0];
                            }
                            catch (err) {
                                htmlData = post["video-player"][0];
                            }
                            var $ = cheerio_1.default.load(htmlData);
                            if ($("source").attr("src") &&
                                !mediaLinks.includes($("source").attr("src")))
                                mediaLinks.push($("source").attr("src"));
                            break;
                        case "photo":
                            try {
                                mediaLinks.push(post["photo-url"][0]["_"]);
                            }
                            catch (err) {
                                var htmlData_1 = post["regular-body"][0];
                                var $_1 = cheerio_1.default.load(htmlData_1);
                                $_1("img").each(function () {
                                    if ($_1(this).attr("src") &&
                                        !mediaLinks.includes($_1(this).attr("src")))
                                        mediaLinks.push($_1(this).attr("src"));
                                });
                            }
                            break;
                    }
                });
                return [4 /*yield*/, getData(site, type, size, start + size).then(function (res) { return res; })];
            case 3:
                data = _a.sent();
                _a.label = 4;
            case 4:
                start += size;
                return [3 /*break*/, 2];
            case 5: return [2 /*return*/, mediaLinks];
        }
    });
}); };
/**
 * Get all files from a directory
 *
 * @param dir Directory name
 * @returns
 */
var _getAllFilesFromFolder = function (dir) {
    var results = [];
    (0, fs_1.readdirSync)(dir).forEach(function (file) {
        file = dir + "/" + file;
        var stat = (0, fs_1.statSync)(file);
        if (stat && stat.isDirectory()) {
            results = results.concat(_getAllFilesFromFolder(file));
        }
        else
            results.push(file);
    });
    return results;
};
/**
 * Any media file downloader
 *
 * @param file Media link
 * @param directory Directory to download the media into
 */
var fileDownloader = function (file, directory) {
    var dl = new node_downloader_helper_1.DownloaderHelper(file, directory);
    dl.start();
    console.log("Success: ", file);
};
/**
 * Convert directory with back slashes into one with forward slashes and creates a new folder.
 *
 * @param dir Parent directory
 * @param name Folder name to create inside the the parent directory
 * @returns
 */
var directoryParser = function (dir, name) {
    dir = dir.replaceAll("\\", "/").concat("/" + name);
    try {
        if (!fs.existsSync(dir)) {
            fs.mkdirSync(dir);
        }
    }
    catch (err) {
        console.error(err);
    }
    return dir;
};
/**
 * Checks if file already exist.
 *
 * @param file file name
 * @returns boolean
 */
var isFileAlreadyExist = function (file) {
    var isExist = false;
    filesInDirectory.map(function (f) {
        if (file.includes(f))
            isExist = true;
    });
    return isExist;
};
/**
 * Download all medias in tumblr account
 *
 * @param site Tumblr account
 * @param type video/photo
 * @param size Number of data per cycle
 * @param start Initial start
 * @param directory Directory to downlod into
 */
var tumblrDownloader = function (site, type, size, start, directory) {
    directory = directoryParser(directory, site);
    filesInDirectory = _getAllFilesFromFolder(directory).map(function (_file) {
        return _file.replace(directory + "/", "");
    });
    getMediaLinks(site, type, size, start).then(function (res) {
        if (res)
            res.map(function (_medialink) {
                if (!isFileAlreadyExist(_medialink)) {
                    axios_1.default
                        .get(_medialink)
                        .then(function (_res) {
                        fileDownloader(_medialink, directory);
                    })
                        .catch(function (_err) {
                        console.log("403: ", _medialink);
                    });
                }
            });
    });
};
//tumblrDownloader(config);
module.exports = { tumblrDownloader: tumblrDownloader };
