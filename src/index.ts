import axios from "axios";
import { parseString } from "xml2js";
import cheerio from "cheerio";
import { readdirSync, statSync } from "fs";
import { DownloaderHelper } from "node-downloader-helper";
import * as fs from "fs";
import * as dotnet from "dotenv";

dotnet.config();

interface IConfig {
  site: string;
  type: string;
  size: number;
  start: number;
  directory: string;
}

let config: IConfig = {
  site: process.env.SITE as string,
  type: process.env.TYPE as string,
  size: Number(process.env.SIZE),
  start: Number(process.env.START),
  directory: process.env.DIRECTORY as string,
};

let TOTAL_POSTS: number = 0;

let filesInDirectory: string[] = [];

const getData = async (
  site: string,
  type: string,
  size: number,
  start: number
): Promise<any> => {
  let _endPoint: string = `https://${site}.tumblr.com/api/read?type=${type}&num=${size}&start=${start}`;
  return axios
    .get(_endPoint)
    .then((res) => res.data)
    .then((res) => {
      let data;
      parseString(res, function (_err, results) {
        data = JSON.parse(JSON.stringify(results));
        TOTAL_POSTS = Number(data.tumblr.posts[0]["$"].total);
      });

      return data;
    })
    .catch((_err) => {
      console.log("Page not found!");
      process.exit(1);
    });
};

/**
 * Get all media links from a tumblr account.
 *
 * @param site Tumblr account
 * @param type video/photo
 * @param size Number of data per cycle
 * @param start Initial start
 * @returns Promise with a List of media links
 */
const getMediaLinks = async (
  site: string,
  type: string,
  size: number,
  start: number
): Promise<string[]> => {
  let mediaLinks: string[] = [];
  let data = await getData(site, type, size, start).then((res) => res);
  for (start; start < TOTAL_POSTS; start += size) {
    data.tumblr.posts[0].post.map((post: any) => {
      switch (type) {
        case "video":
          let htmlData;
          try {
            htmlData = post["regular-body"][0];
          } catch (err) {
            htmlData = post["video-player"][0];
          }
          let $ = cheerio.load(htmlData);
          if (
            ($("source").attr("src") as string) &&
            !mediaLinks.includes($("source").attr("src") as string)
          )
            mediaLinks.push($("source").attr("src") as string);

          break;

        case "photo":
          try {
            mediaLinks.push(post["photo-url"][0]["_"]);
          } catch (err) {
            let htmlData: string = post["regular-body"][0];
            let $ = cheerio.load(htmlData);
            $("img").each(function () {
              if (
                ($(this).attr("src") as string) &&
                !mediaLinks.includes($(this).attr("src") as string)
              )
                mediaLinks.push($(this).attr("src") as string);
            });
          }

          break;
      }
    });

    data = await getData(site, type, size, start + size).then((res) => res);
  }

  return mediaLinks;
};

/**
 * Get file from a directory
 *
 * @param dir Directory name
 * @returns
 */
const _getAllFilesFromFolder = function (dir: string) {
  let results: string[] = [];
  readdirSync(dir).forEach(function (file) {
    file = dir + "/" + file;
    let stat = statSync(file);
    if (stat && stat.isDirectory()) {
      results = results.concat(_getAllFilesFromFolder(file));
    } else results.push(file);
  });
  return results;
};

/**
 * Any media file downloader
 *
 * @param file Media link
 * @param directory Directory to download the media into
 */
const fileDownloader = (file: string, directory: string) => {
  let dl = new DownloaderHelper(file, directory);
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
const directoryParser = (dir: string, name: string) => {
  dir = dir.replaceAll("\\", "/").concat("/" + name);

  try {
    if (!fs.existsSync(dir)) {
      fs.mkdirSync(dir);
    }
  } catch (err) {
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
const isFileAlreadyExist = (file: string): boolean => {
  let isExist: boolean = false;
  filesInDirectory.map((f) => {
    if (file.includes(f)) isExist = true;
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
const tumblrDownloader = (
  site: string,
  type: string,
  size: number,
  start: number,
  directory: string
) => {
  directory = directoryParser(directory, site);
  filesInDirectory = _getAllFilesFromFolder(directory).map((_file) =>
    _file.replace(directory + "/", "")
  );

  getMediaLinks(site, type, size, start).then((res) => {
    if (res)
      res.map((_medialink) => {
        if (!isFileAlreadyExist(_medialink)) {
          axios
            .get(_medialink)
            .then((_res) => {
              fileDownloader(_medialink, directory);
            })
            .catch((_err) => {
              console.log("403: ", _medialink);
            });
        }
      });
  });
};

//tumblrDownloader(config);

module.exports = { tumblrDownloader }
