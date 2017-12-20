var express = require('express');
var router = express.Router();
var path = require('path');
var upload = require('./upload')

router.post('/', function(req, res, next) {
    console.log(req)
    upload(req, res, function(err) {
        if (err) {
            console.log(err)
        }
    })
});

function outputFileSize(size) {
    if (size > 1024) {
        size = size / 1024;
        if (size > 1024) {
            size = size / 1024;
            if (size > 1024) {
                size = size / 1024;
                return size + "GB"
            } else {
                return size + "MB"
            }
        } else {
            return size + "KB"
        }
    } else {
        return size + "B"
    }
}
module.exports = router;