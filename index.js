'use strict';
const debug = require('debug')('vobject:performance');

const request = require('request');
//require('request-debug')(request);

const fs = require('fs');
const path = require('path');
const mime = require('mime-types')
const Jimp = require('jimp');
// const StreamReadable = require('buffer-to-stream');
process.env.NODE_TLS_REJECT_UNAUTHORIZED = "0";

const LIFE_TIME = process.env.LIFE_TIME || 1000 * 60 * 3; //3 minutes
const IMAGE_SERVICE_URI = process.env.URL || 'https://icp.innovate.ibm.com:30006/image';
const PROCESS_INTERVAL = process.env.INTERVAL || 3000;
const IMAGE_SRC_DIR = process.env.IMG_SRC_DIR || path.resolve(__dirname, 'img-src');
const IMAGE_TEST_DIR = process.env.IMG_TEST_DIR || path.resolve(__dirname, 'img-test');

const IMAGE_FORMDATA = {
    threshold: '0.40',
    image: 'BLOB-DATA',
    rand: 0
}
const POST_OPTIONS = {
    url: IMAGE_SERVICE_URI,
    method: 'POST',
    formData: undefined
};

let reqDatas = [];
let reqFiles = [];

function listTestSrc(srcDir) {
    debug('srcDir %s', srcDir);
    fs.readdir(srcDir, function(err, files) {
        files.forEach(function(file) {
            let filepath = path.resolve(srcDir, file);
            debug('File %o', filepath);
            let type = mime.lookup(filepath);
            if (/image\//.test(type)) {
                debug('It is image file?, %s', file);
                fs.stat(filepath, function(err, stats) {
                    // Make sure it is a file
                    if (stats && stats.isFile()) {
                        debug('File YES %o', stats);
                        let formData = Object.assign({}, IMAGE_FORMDATA);
                        let postOptions = Object.assign({}, POST_OPTIONS, { formData: formData });
                        reqDatas.push(postOptions);
                        reqFiles.push(filepath);
                    }
                });
            } else {
                debug('Ignore unsupported file, %s', file);
            }
        });
    });
};

function getReqData() {
    return new Promise(function(resolve, reject) {
        if (reqDatas.length === 0) {
            reject('No data input');
            return;
        }
        let rand = Math.round(Math.random() * 10000000000);
        let posi = rand % (reqDatas.length);
        let data = Object.assign({}, reqDatas[posi]); //copy data
        let filepath = reqFiles[posi];
        debug('getReqData at %d, rand %s, file: %s', posi, rand, filepath);

        let x = rand % 100;
        let y = rand % 100;
        let maxWidth = 256;
        let maxHeight = 256;
        let text = 'Hello-' + rand;
        let outpath = path.resolve(IMAGE_TEST_DIR, text + '.jpg');
        Jimp.read(filepath).then(function(image) {
            debug('Jimp read image');
            image.resize(maxWidth, maxHeight)
                .quality(90)
                .greyscale()
                .print(font, x, y, {
                    text: text,
                    alignmentX: Jimp.HORIZONTAL_ALIGN_CENTER,
                    alignmentY: Jimp.VERTICAL_ALIGN_MIDDLE
                }, maxWidth, maxHeight)
                // .getBuffer('image/jpeg', function(err, buff) {
                //                 debug('Jimp getBuffer result, %o', err);
                //                 data.formData.image = StreamReadable(buff);
                //                 resolve(data);
                //             })
                .write(outpath, function(err, x) {
                    debug('Jimp write result, %o, %o', err, x);
                    data.formData.image = fs.createReadStream(outpath);
                    resolve(data);
                });
        }).catch(err => {
            debug('Manipulate Image issue, err %o', err);
            reject('Can not read image');
        });
    });
};
async function doPost() {
    debug('doPost START');
    let opt = await getReqData();
    if (!opt) {
        debug('doPost: No input data!');
        return;
    }
    //debug(opt)
    request.post(opt, function cb(err, respose, body) {
        if (err) {
            debug('doPost: Error ...%o', err);
            return;
        }
        debug('doPost: Result...%o', body);
    });
};

function showDurationTime(l) {
    let s = l / 1000;
    let m = Math.floor(s / 60);
    let h = Math.floor(m / 60);
    s = Math.floor(s - m * 60);
    m = m - h * 60;
    return (h + ':' + m + ':' + s);
};

var timer = null;
var timeStart = null;
var timeEnd = null;
var counter = 0;
var font = null;

function processManage() {
    debug('processManage START');
    timeEnd = new Date();
    doPost()
    counter++;
    let runningTime = timeEnd.getTime() - timeStart.getTime();
    debug('process number %d, duration %s, start %s', counter, showDurationTime(runningTime), timeStart);
    if (runningTime > LIFE_TIME && timer) {
        clearInterval(timer);
        timer = null;
        debug('STOP Interval process!');
        process.exit(0);
    }
    debug('processManage FINISH');
}

function startup() {
    debug('startup');
    timeStart = new Date();
    listTestSrc(IMAGE_SRC_DIR);
    Jimp.loadFont(Jimp.FONT_SANS_32_BLACK).then(function(result) {
        debug('Loaded font');
        font = result;
    });
    timer = setInterval(processManage, PROCESS_INTERVAL);
}




//Kick it off
startup();