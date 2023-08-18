import axios from "axios";
import { parseString } from "xml2js";
import cheerio from "cheerio";
import { DownloaderHelper } from "node-downloader-helper";
import * as fs from "fs";
import * as dotnet from "dotenv";

dotnet.config();

interface IData {
  video: string[],
  photo: string[] 
}
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

let filesInDirectory: IData = {video: [], photo: []};

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
 * Get all files from a directory
 *
 * @param dir Directory name
 * @returns
 */
const _getAllFilesFromFolder = function (dir: string, site: string) {
  try {
    filesInDirectory = require(`${dir}/${site}.json`);
  } catch (e) {
    console.log("New user detected!");
  }

  return filesInDirectory;
};

const saveToFile = (fileName: string, data: IData, dir: string) => {
  fs.writeFile(
    `${dir}/${fileName}.json`,
    JSON.stringify(data),
    (error) => {
      if (error) console.warn("Error: ", error);
    }
  );
};

/**
 * Any media file downloader
 *
 * @param file Media link
 * @param directory Directory to download the media into
 */
const fileDownloader = (file: string, directory: string): Promise<boolean> => {
  let dl = new DownloaderHelper(file, directory);
  dl.start();
  console.log("Success: ", file);
  return Promise.resolve(true)
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
const isFileAlreadyExist = (file: string, type: string): boolean => {
  let isExist: boolean = false;
  if(type === "video"){
    filesInDirectory.video.map((f) => {
      if (file.includes(f)) isExist = true;
    });
  }
  else if(type === "photo"){
    filesInDirectory.photo.map((f) => {
      if (file.includes(f)) isExist = true;
    });
  }
  
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
  filesInDirectory = _getAllFilesFromFolder(directory, site)

  getMediaLinks(site, type, size, start).then((res) => {
    if (res){
      res.map(async(_medialink) => {
        if (!isFileAlreadyExist(_medialink, type)) {
          await axios
            .get(_medialink)
            .then(async(_res) => {
              await fileDownloader(_medialink, directory);
              console.log("done")
            })
            .catch((_err) => {
              console.log("403: ", _medialink);
            });
        }
      });
      type === "video" ? filesInDirectory.video = res : filesInDirectory.photo = res
      saveToFile(site, filesInDirectory, directory)
    }
  });
};

//tumblrDownloader(config.site, config.type, config.size, config.start, config.directory);

module.exports = { tumblrDownloader }
