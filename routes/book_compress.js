const fs = require('fs-extra');
const path = require('path');
const dir = path.join(__dirname, '../public/etzr_resource/content/')
const fileDir = path.join(__dirname, '../public/etzr_resource/content_compressed/')


fs.readdir(dir, (err, files) => {
    if (!files.length) {
        console.log("没有文件！")
    } else {
        let book = [];
        let bookLen = files.length;
        let bookExtra = {};
        let errorArr = [];
        let wholeString = ""
        files.forEach((el, index) => {
            let pos = el.split('.');
            pos = pos[pos.length - 1]
            let reg = new RegExp('.' + pos)
            let pageNum = el.replace(reg, '')

            if (pos !== 'html') {
                bookLen--;
                errorArr.push(el)
            }
            if (!isNaN(pageNum)) {
                book[pageNum] = '<div class="bb-item double" id="page_' + pageNum + '">\n' + fs.readFileSync(dir + el, 'utf-8') + '\n</div>\n\n';
            } else {
                bookLen--;
                bookExtra[pageNum] = fs.readFileSync(dir + el, 'utf-8');
            }
        })

        book[1] = '<div class="page hard"></div>\n' + book[1];
        book[bookLen] = book[bookLen] + '\n<div class="page hard"></div>';
        console.log("文件数：------->" + bookLen)

        book.forEach((el, index) => {
            wholeString += el;
        })
        for (var i in bookExtra) {
            if (bookExtra.hasOwnProperty(i)) {
                wholeString += bookExtra[i];
            }
        }
        console.log("文件读取完成，准备写入---------->")
        fs.outputFile(fileDir + 'content_compressed.html', wholeString, function (err) {
            if (err) {
                console.log(err);
            } else {
                console.log("文件写入完成，地址为:" + fileDir + 'content_compressed.html')
            }
        })
        if (errorArr) {
            console.log("以下文件后缀名有误，已跳过，请检查 -->\n" + errorArr);
        }

    }
})