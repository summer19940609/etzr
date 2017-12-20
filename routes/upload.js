var fs = require('fs-extra');
var multer = require('multer');
var path = require('path')
var uploadPath = path.join(__dirname,'../uploads')
var storage = multer.diskStorage({
    destination: function(req, file, cb) {
        var uploadDir = uploadPath;
        fs.ensureDir(uploadDir, function(err) {
            cb(null, uploadDir)
        });
    },
    filename: function(req, file, cb) {
        cb(null, Date.now() + '-' + file.originalname)
    }
})
var upload = multer({
    storage: storage,
    fileFilter: function(req, file, cb) {
        console.log(file)
        cb(null, true)
    }
}).any()

module.exports = upload;