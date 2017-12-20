var uuid = require('uuid')
var path = require('path');
var express = require('express');
var router = express.Router();
var Sequelize = require('sequelize')
var upload = require('../../upload');
var config = require(path.join(__dirname, '../../../config'));
var co = require('co');
var moment = require('moment');
/*读取配置文件里的MySQL连接信息*/
var sqlConfig = config["sqlConfig"];
var database = sqlConfig["database"];
var username = sqlConfig["user"];
var password = sqlConfig["password"];
var host = sqlConfig["host"];
var sequelize = new Sequelize(database, username, password, sqlConfig["options"]);

var RESOURCE = require('../sql_modual/resouce_table')(sequelize, Sequelize)
var DIARY = require('../sql_modual/postings_table')(sequelize, Sequelize)
var THUMBS_UP = require('../sql_modual/thumbsup_table')(sequelize, Sequelize)
var COMMENT = require('../sql_modual/comment_table')(sequelize, Sequelize)
var USER = require('../sql_modual/user_etzr')(sequelize, Sequelize)


/*---------------几个表之间的关系，sequelize后面的多表联合查询前提条件---------------*/
//user_etzr和postings_table之间关系
DIARY.belongsTo(USER, {
    foreignKey: 'user_id'
});
USER.hasMany(DIARY, {
    foreignKey: 'user_id'
});
//user_etzr和comment_table之间关系
COMMENT.belongsTo(USER, {
    foreignKey: 'user_id'
});
USER.hasMany(COMMENT, {
    foreignKey: 'user_id'
});
//postings_table和resouce_table之间关系
DIARY.hasMany(RESOURCE, {
    foreignKey: 'parent_id',
    as: 'imgData'
});
/*-----------------------------------------------------------------------------------*/


/*---------------方法---------------*/
var diarySqlFun = {
        /*查找用户*/
        findUserOne: function(user_id) {
            var info = {
                flag: false,
                message: "",
                data: {}
            };
            var promise = new Promise(function(resolve, reject) {
                USER.findOne({
                    attributes: ['user_id', 'real_name'],
                    where: {
                        user_id: user_id
                    }
                }).then(function(result) {
                    if (result) {
                        var data = JSON.parse(JSON.stringify(result));
                        info.data = data;
                        info.flag = true;
                        info.message = "查找用户成功";
                        resolve(info);
                    } else {
                        info.message = "查找用户为空";
                        info.flag = true;
                        info.data = null;
                        resolve(info);
                    }
                }, function(err) {
                    console.log(err);
                    info.message = "数据库连接失败";
                    reject(info);
                })
            });
            return promise;
        },

        /*插入用户*/
        insertUser: function(user_id, name, roleType) {
            var info = {
                flag: false,
                message: ""
            };
            var promise = new Promise(function(resolve, reject) {
                USER.create({
                    'user_id': user_id,
                    'real_name': name,
                    'role_type': roleType
                }).then(function(result) {
                    info.message = "用户添加成功";
                    info.flag = true;
                    resolve(info);
                }, function(err) {
                    console.log(err);
                    info.message = "数据库连接失败";
                    reject(info);
                })
            });
            return promise;
        },
        /*更新用户*/
        updateUser: function(user_id, name, roleType) {
            var info = {
                flag: false,
                message: ""
            };
            var promise = new Promise(function(resolve, reject) {
                USER.update({
                    'real_name': name,
                    'role_type': roleType
                }, {
                    where: {
                        "user_id": user_id
                    }
                }).then(function(result) {
                    info.flag = true;
                    info.message = "更新成功";
                    resolve(info);
                }, function(err) {
                    console.log(err);
                    info.message = "更新失败";
                    reject(info);
                })
            });
            return promise;
        },

        /*添加日记*/
        insertDiary: function(id, user_id, content, weather, add_time, pass_flag) {
            var info = {
                flag: false,
                message: ""
            };
            var promise = new Promise(function(resolve, reject) {
                DIARY.create({
                    'id': id,
                    'user_id': user_id,
                    'content': content,
                    'otherfield': weather,
                    'new_create_time': add_time,
                    'post_type': 1,
                    'del_flag': 0,
                    'pass_flag': pass_flag
                }).then(function(result) {
                    info.message = "日记添加成功";
                    info.flag = true;
                    resolve(info);
                }, function(err) {
                    console.log(err);
                    info.message = "数据库连接失败";
                    reject(info);
                })
            });
            return promise;
        },


        /*添加上传文件记录*/
        insertFile: function(fileArr) {
            var info = {
                flag: false,
                message: ""
            };
            var promise = new Promise(function(resolve, reject) {
                RESOURCE.bulkCreate(fileArr).then(function(result) {
                    info.message = "图片添加成功";
                    info.flag = true;
                    resolve(info);
                }, function(err) {
                    console.log(err);
                    info.message = "数据库连接失败";
                    reject(info);
                })
            });
            return promise;
        },

        //查询帖子、活动、教师总条数
        getCount: function(post_type) {
            var info = {
                flag: false,
                message: ""
            }
            var promise = new Promise(function(resolve, reject) {
                DIARY.count({
                    where: {
                        "post_type": post_type,
                        "del_flag": 0
                    }
                }).then(function(result) {
                    console.log(result);
                    //查询到的该post_type的数量
                    info.flag = true;
                    info.message = "数量查询成功";
                    info.count = result;
                    resolve(info);
                }, function(err) {
                    console.log(err);
                    info.message = "数据库连接失败";
                    reject(info);
                })
            });
            return promise;
        },

        //查询审核通过和未通过的日记数量
        getDiaryCount: function(pass_flag) {
            var info = {
                flag: false,
                message: ""
            }
            var promise = new Promise(function(resolve, reject) {
                DIARY.count({
                    where: {
                        "post_type": 1,
                        "del_flag": 0,
                        "pass_flag": pass_flag
                    }
                }).then(function(result) {
                    console.log(result);
                    //查询到的该post_type的数量
                    info.flag = true;
                    info.message = "数量查询成功";
                    info.count = result;
                    resolve(info);
                }, function(err) {
                    console.log(err);
                    info.message = "数据库连接失败";
                    reject(info);
                })
            });
            return promise;
        },

        //得到佳作相应年份的数量
        getFineworkCount: function(time) {
            var info = {
                flag: false,
                message: ""
            };
            var promise = new Promise(function(resolve, reject) {
                sequelize.query('SELECT count(*) FROM postings_table WHERE YEAR (new_create_time) = YEAR (?) AND post_type = 2 AND del_flag = 0', {
                    replacements: [time],
                    type: sequelize.QueryTypes.SELECT
                }).then(function(result) {
                    console.log(result);
                    info.count = result[0]["count(*)"];
                    info.message = "查找数量成功";
                    info.flag = true;
                    resolve(info);
                }, function(err) {
                    console.log(err);
                    info.message = "数据库连接失败";
                    reject(info);
                })
            });
            return promise;
        },

        getDiaryAndImages: function(page, order, orderType, pass_flag) {
            var info = {
                flag: false,
                message: ""
            };
            var promise = new Promise(function(resolve, reject) {
                var pn = 10;
                page = parseInt(page - 1) * pn;
                DIARY.findAndCountAll({
                    attributes: ['id', 'user_id', 'content', 'title', 'otherfield', 'thumbsUp_num', 'comment_num', 'new_create_time', 'create_time', 'update_time', 'pass_flag'],
                    order: [
                        [orderType, order]
                    ],
                    include: [{
                        model: RESOURCE,
                        as: 'imgData',
                        attributes: ['id', 'parent_id', 'resource_url', 'preview_url', 'img_url_L', 'img_url_m', 'img_url_s']
                    }],
                    where: {
                        "del_flag": 0,
                        "post_type": 1,
                        "pass_flag": pass_flag
                    },
                    offset: page,
                    limit: pn
                }).then(function(result) {
                    console.log(JSON.parse(JSON.stringify(result)));
                    if (result.rows.length) {
                        var data = JSON.parse(JSON.stringify(result));
                        console.log(data);
                        info.data = data.rows;
                        info.flag = true;
                        info.message = "获取数据成功";
                        resolve(info);
                    } else {
                        info.message = "查找数据为空";
                        info.flag = true;
                        info.data = null;
                        resolve(info);
                    }
                }, function(err) {
                    console.log(err);
                    info.message = "数据库连接失败";
                    reject(info);
                })
            });
            return promise;
        },

        //获得日记和作者和身份信息
        getDiaryInfo: function(page, order, orderType, pass_flag) {
            var info = {
                flag: false,
                message: ""
            };
            var promise = new Promise(function(resolve, reject) {
                var pn = 10;
                page = parseInt(page - 1) * pn;
                DIARY.findAndCountAll({
                    attributes: [
                        [sequelize.col('user_etzr.real_name'), 'real_name'],
                        [sequelize.col('user_etzr.role_type'), 'roleType']
                    ],
                    order: [
                        [orderType, order]
                    ],
                    include: [{
                        model: USER,
                        attributes: []
                    }],
                    where: {
                        "del_flag": 0,
                        "post_type": 1,
                        "pass_flag": pass_flag
                    },
                    offset: page,
                    limit: pn
                }).then(function(result) {
                    if (result.rows.length) {
                        var data = JSON.parse(JSON.stringify(result));
                        info.data = data.rows;
                        info.flag = true;
                        info.message = "获取数据成功";
                        resolve(info);
                    } else {
                        info.message = "查找数据为空";
                        info.flag = true;
                        info.data = null;
                        resolve(info);
                    }
                }, function(err) {
                    console.log(err);
                    info.message = "数据库连接失败";
                    reject(info);
                })
            });
            return promise;
        },


        //获取点赞状态
        getLikeStatus: function(user_id, diaryId) {
            var info = {
                flag: false,
                message: ""
            };
            var promise = new Promise(function(resolve, reject) {
                THUMBS_UP.findOne({
                    where: {
                        'user_id': user_id,
                        'del_flag': 0,
                        'parent_id': diaryId
                    }
                }).then(function(result) {
                    if (result) {
                        var data = JSON.parse(JSON.stringify(result));
                        info.data = data;
                        info.flag = true;
                        info.message = "查找点赞状态成功";
                        resolve(info);
                    } else {
                        info.message = "没有查询到点赞状态";
                        info.data = null;
                        info.flag = true;
                        resolve(info);
                    }
                }, function(err) {
                    console.log(err);
                    info.message = "数据库连接失败";
                    reject(info);
                })
            });
            return promise;
        },

        findDiaryOne: function(id) {
            var info = {
                flag: false,
                message: ""
            };
            var promise = new Promise(function(resolve, reject) {
                sequelize.query('SELECT a.id,a.user_id,a.title,a.content,a.otherfield,a.thumbsUp_num,a.new_create_time,a.create_time,a.update_time,a.comment_num,a.pass_flag,b.real_name,b.role_type FROM postings_table a LEFT JOIN user_etzr b on a.user_id=b.user_id WHERE a.id=? limit 1', {
                    replacements: [id],
                    type: sequelize.QueryTypes.SELECT
                }).then(function(result) {
                    if (result.length) {
                        var data = JSON.parse(JSON.stringify(result));
                        data[0].new_create_time = moment(data[0].new_create_time).format("YYYY-MM-DD HH:mm:ss");
                        info.data = data[0];
                        info.flag = true;
                        info.message = "查找日记成功";
                        resolve(info);
                    } else {
                        info.message = "查找日记为空";
                        info.flag = true;
                        info.data = null;
                        resolve(info);
                    }
                }, function(err) {
                    console.log(err);
                    info.message = "数据库连接失败";
                    reject(info);
                })
            });
            return promise;
        },



        //获取图片信息
        getImgInfo: function(id) {
            var info = {
                flag: false,
                message: "",
                data: {}
            };
            var promise = new Promise(function(resolve, reject) {
                RESOURCE.findAll({
                    where: {
                        parent_id: id
                    }
                }).then(function(result) {
                    var data = JSON.parse(JSON.stringify(result));
                    if (data.length) {
                        info.data = data;
                        info.flag = true;
                        info.message = "获取图片信息成功";
                        resolve(info);
                    } else {
                        info.message = "获取图片信息为空";
                        info.flag = true;
                        info.data = null;
                        resolve(info);
                    }
                }, function(err) {
                    console.log(err);
                    info.message = "数据库连接失败";
                    reject(info);
                })
            });
            return promise;
        },

        //删除日记
        deleteDiary: function(id) {
            var info = {
                flag: false,
                message: ""
            };
            var promise = new Promise(function(resolve, reject) {
                DIARY.update({
                    'del_flag': 1
                }, {
                    where: {
                        "id": id
                    }
                }).then(function(result) {
                    info.flag = true;
                    info.message = "删除成功";
                    resolve(info);
                }, function(err) {
                    console.log(err);
                    info.message = "删除失败";
                    reject(info);
                })
            });
            return promise;
        },

        //审核通过日记，pass_flag由0变为1
        updatePassFlag: function(id) {
            var info = {
                flag: false,
                message: ""
            };
            var promise = new Promise(function(resolve, reject) {
                DIARY.update({
                    'pass_flag': 1
                }, {
                    where: {
                        "id": id
                    }
                }).then(function(result) {
                    info.flag = true;
                    info.message = "审核通过成功";
                    resolve(info);
                }, function(err) {
                    console.log(err);
                    info.message = "审核失败";
                    reject(info);
                })
            });
            return promise;
        },



        //插入点赞记录
        addThumbsUp: function(id, parent_id, user_id) {
            var info = {
                flag: false,
                message: ""
            };
            var promise = new Promise(function(resolve, reject) {
                THUMBS_UP.create({
                    'id': id,
                    'parent_id': parent_id,
                    'user_id': user_id,
                    'del_flag': 0
                }).then(function(result) {
                    info.message = "点赞添加成功";
                    info.flag = true;
                    resolve(info);
                }, function(err) {
                    console.log(err);
                    info.message = "插入点赞记录失败";
                    reject(info);
                })
            });
            return promise;
        },



        //更新点赞数量
        updateThNum: function(parent_id, update_flag) {
            var info = {
                flag: false,
                message: ""
            };
            var promise = new Promise(function(resolve, reject) {
                /*自增*/
                if (update_flag === "increment") {
                    DIARY.findById(parent_id).then(function(diary) {
                        diary.increment('thumbsUp_num').then(function(result) {
                            info.message = "更新点赞数成功";
                            info.flag = true;
                            resolve(info);
                        }, function(err) {
                            console.log(err);
                            info.message = "更新点赞数失败";
                            reject(info);
                        })
                    }, function(err) {
                        console.log(err);
                        info.message = "查找日记失败";
                        reject(info);
                    })
                } else {
                    //自减
                    DIARY.findById(parent_id).then(function(diary) {
                        diary.decrement('thumbsUp_num').then(function(diary) {
                            info.message = "更新点赞数成功";
                            info.flag = true;
                            resolve(info);
                        }, function(err) {
                            console.log(err);
                            info.message = "更新点赞数失败";
                            reject(info);
                        })
                    }, function(err) {
                        console.log(err);
                        info.message = "查找日记失败";
                        reject(info);
                    })
                }
            });
            return promise;
        },

        //删除点赞记录
        deleteThumbsUp: function(parent_id, user_id) {
            var info = {
                flag: false,
                message: ""
            };
            var promise = new Promise(function(resolve, reject) {
                THUMBS_UP.update({
                    'del_flag': 1
                }, {
                    where: {
                        'parent_id': parent_id,
                        'user_id': user_id
                    }
                }).then(function(result) {
                    info.message = "删除点赞记录成功";
                    info.flag = true;
                    resolve(info);
                }, function(err) {
                    console.log(err);
                    info.message = "删除点赞记录失败";
                    reject(info);
                })
            });
            return promise;
        },


        diaryLookNext: function(Time) {
            var info = {
                flag: false,
                message: ""
            };
            var promise = new Promise(function(resolve, reject) {
                sequelize.query('SELECT p.id,p.user_id,p.content,p.otherfield,p.thumbsUp_num,p.new_create_time,p.create_time,p.update_time,b.real_name,b.role_type FROM ( SELECT * FROM postings_table WHERE postings_table.post_type = 1 AND postings_table.del_flag = 0 AND postings_table.pass_flag = 1 ) AS p left join user_etzr b on p.user_id = b.user_id WHERE  p.new_create_time = (SELECT min(new_create_time) FROM postings_table p WHERE p.post_type = 1 AND p.del_flag = 0 AND p.pass_flag = 1 AND p.new_create_time > ? )', {
                    replacements: [Time],
                    type: sequelize.QueryTypes.SELECT
                }).then(function(result) {
                    if (result.length) {
                        var data = JSON.parse(JSON.stringify(result));
                        console.log(data);
                        for (var i = 0; i < data.length; i++) {
                            data[i].new_create_time = moment(data[i].new_create_time).format("YYYY-MM-DD HH:mm:ss");
                        }
                        info.flag = true;
                        info.message = "查找日记成功";
                        info.data = data;
                        console.log(info);
                        resolve(info);
                    } else {
                        info.message = "没有下一个了";
                        info.flag = true;
                        info.data = null;
                        resolve(info);
                    }
                }, function(err) {
                    console.log(err);
                    info.message = "数据库连接失败";
                    reject(info);
                })
            });
            return promise;
        },

        //上一篇
        diaryLookPrev: function(Time) {
            var info = {
                flag: false,
                message: ""
            };
            var promise = new Promise(function(resolve, reject) {
                sequelize.query('SELECT p.id,p.user_id,p.content,p.otherfield,p.thumbsUp_num,p.new_create_time,p.create_time,p.update_time,b.real_name,b.role_type FROM ( SELECT * FROM postings_table WHERE postings_table.post_type = 1 AND postings_table.del_flag = 0 AND postings_table.pass_flag = 1 ) AS p left join user_etzr b on p.user_id = b.user_id WHERE  p.new_create_time = (SELECT max(new_create_time) FROM postings_table p WHERE p.post_type = 1 AND p.del_flag = 0  AND p.pass_flag = 1 AND p.new_create_time < ? )', {
                    replacements: [Time],
                    type: sequelize.QueryTypes.SELECT
                }).then(function(result) {
                    if (result.length) {
                        var data = JSON.parse(JSON.stringify(result));
                        for (var i = 0; i < data.length; i++) {
                            data[i].new_create_time = moment(data[i].new_create_time).format("YYYY-MM-DD HH:mm:ss");
                        }
                        info.flag = true;
                        info.message = "查找日记成功";
                        info.data = data;
                        resolve(info);
                    } else {
                        info.message = "没有上一个了";
                        info.flag = true;
                        info.data = null;
                        resolve(info);
                    }
                }, function(err) {
                    console.log(err);
                    info.message = "数据库连接失败";
                    reject(info);
                })
            });
            return promise;
        },


        //最近的一篇和手动选择时间
        diaryLookNow: function(Time) {
            var info = {
                flag: false,
                message: ""
            };
            var promise = new Promise(function(resolve, reject) {
                sequelize.query('SELECT p.id,p.user_id,p.content,p.otherfield,p.thumbsUp_num,p.new_create_time,p.create_time,p.update_time,b.real_name,b.role_type FROM ( SELECT * FROM postings_table WHERE postings_table.post_type = 1 AND postings_table.del_flag = 0 AND postings_table.pass_flag = 1 ) AS p left join user_etzr b on p.user_id = b.user_id WHERE p.new_create_time = (SELECT max(new_create_time) FROM postings_table p WHERE p.post_type = 1 AND p.del_flag = 0 AND p.pass_flag = 1 AND p.new_create_time <= ?)', {
                    replacements: [Time],
                    type: sequelize.QueryTypes.SELECT
                }).then(function(result) {
                    if (result.length) {
                        var data = JSON.parse(JSON.stringify(result));
                        for (var i = 0; i < data.length; i++) {
                            data[i].new_create_time = moment(data[i].new_create_time).format("YYYY-MM-DD HH:mm:ss");
                        }
                        info.flag = true;
                        info.message = "查找日记成功";
                        info.data = data;
                        resolve(info);
                    } else {
                        info.message = "没有上一个了";
                        info.flag = true;
                        info.data = null;
                        resolve(info);
                    }
                }, function(err) {
                    console.log(err);
                    info.message = "数据库连接失败";
                    reject(info);
                })
            });
            return promise;
        },

        //返回某年某月几号有日记
        getMonthDiary: function(year, month) {
            var info = {
                flag: false,
                message: "",
                data: []
            }
            var year_month = year + ' ' + month; //2017 11
            var promise = new Promise(function(resolve, reject) {
                sequelize.query('SELECT DATE_FORMAT(postings_table.new_create_time,"%e") FROM postings_table WHERE DATE_FORMAT(postings_table.new_create_time, "%Y %c") = ? AND post_type = 1 AND del_flag = 0 AND pass_flag = 1', {
                    replacements: [year_month],
                    type: sequelize.QueryTypes.SELECT
                }).then(function(result) {
                    if (result.length) {
                        console.log(result);
                        var resultArr = [];
                        var dayData = JSON.parse(JSON.stringify(result));
                        for (var i = 0; i < dayData.length; i++) {
                            console.log(dayData[i]['DATE_FORMAT(postings_table.new_create_time,"%e")']);
                            if (resultArr.indexOf(dayData[i]['DATE_FORMAT(postings_table.new_create_time,"%e")']) == -1) {
                                resultArr.push(dayData[i]['DATE_FORMAT(postings_table.new_create_time,"%e")']);
                            }
                        }
                        info.data = resultArr;
                        info.flag = true;
                        info.message = "查找日记成功";
                        resolve(info);
                    } else {
                        info.message = "当月没有日记";
                        info.flag = true;
                        info.data = null;
                        resolve(info);
                    }
                }, function(reject) {
                    console.log(err);
                    info.message = "数据库连接失败";
                    reject(info);
                })
            });
            return promise;
        },


        //得到传入id的日记在表里的序号
        getDiaryNum: function(id) {
            var info = {
                flag: false,
                message: ""
            }
            var promise = new Promise(function(resolve, reject) {
                sequelize.query('SELECT a.newid FROM (SELECT ( @i := @i + 1 ) AS newid,postings_table.new_create_time,postings_table.id FROM postings_table,( SELECT @i := 0 ) AS it WHERE postings_table.post_type = 1 AND postings_table.del_flag = 0 AND postings_table.pass_flag = 1 ORDER BY   postings_table.new_create_time ASC ) AS a WHERE a.id = ?', {
                    replacements: [id],
                    type: sequelize.QueryTypes.SELECT
                }).then(function(result) {
                    console.log(result);
                    info.data = result[0]['newid'];
                    info.message = "查找日记序号成功";
                    resolve(info);
                }, function(err) {
                    console.log(err);
                    info.message = "数据库连接失败";
                    reject(info);
                })
            });
            return promise;
        },

        /*****************佳作赏析部分********************/
        //获取佳作信息
        getFineworkInfo: function(page, time) {
            var info = {
                flag: false,
                message: "",
                data: {}
            };
            var promise = new Promise(function(resolve, reject) {
                var pn = 9;
                page = parseInt(page - 1) * pn;
                sequelize.query('SELECT p.*,r.resource_url,r.preview_url,r.img_url_L,r.img_url_m,r.img_url_s FROM postings_table p LEFT JOIN resouce_table r ON p.id=r.parent_id WHERE p.post_type=2 AND p.del_flag=0 AND YEAR (new_create_time) = YEAR (?) ORDER BY p.new_create_time DESC limit ?,9', {
                    replacements: [time, page],
                    type: sequelize.QueryTypes.SELECT
                }).then(function(result) {
                    if (result.length) {
                        var data = JSON.parse(JSON.stringify(result));
                        info.flag = true;
                        info.message = "查找佳作成功";
                        info.data = data;
                        resolve(info);
                    } else {
                        info.message = "查找佳作为空";
                        info.flag = true;
                        info.data = null;
                        resolve(info);
                    }
                }, function(err) {
                    console.log(err);
                    info.message = "数据库连接失败";
                    reject(info);
                })
            });
            return promise;
        },

        getFineworkUserInfo: function(page, time) {
            var info = {
                flag: false,
                message: "",
                data: {}
            };
            var promise = new Promise(function(resolve, reject) {
                var pn = 9;
                page = parseInt(page - 1) * pn;
                sequelize.query('SELECT u.real_name,u.role_type FROM postings_table p LEFT JOIN user_etzr u ON p.user_id=u.user_id WHERE p.post_type=2 AND p.del_flag=0 AND YEAR (new_create_time) = YEAR (?) ORDER BY p.new_create_time DESC limit ?,9', {
                    replacements: [time, page],
                    type: sequelize.QueryTypes.SELECT
                }).then(function(result) {
                    if (result.length) {
                        var data = JSON.parse(JSON.stringify(result));
                        info.flag = true;
                        info.message = "查找佳作成功";
                        info.data = data;
                        resolve(info);
                    } else {
                        info.message = "查找佳作为空";
                        info.flag = true;
                        info.data = null;
                        resolve(info);
                    }
                }, function(err) {
                    console.log(err);
                    info.message = "数据库连接失败";
                    reject(info);
                })
            });
            return promise;
        },



        /*添加佳作*/
        insertFinework: function(id, user_id, title, content, add_time) {
            var info = {
                flag: false,
                message: ""
            };
            var promise = new Promise(function(resolve, reject) {
                DIARY.create({
                    'id': id,
                    'user_id': user_id,
                    'title': title,
                    'content': content,
                    'new_create_time': add_time,
                    'post_type': 2,
                    'del_flag': 0
                }).then(function(result) {
                    info.message = "佳作添加成功";
                    info.flag = true;
                    resolve(info);
                }, function(err) {
                    console.log(err);
                    info.message = "数据库连接失败";
                    reject(info);
                })
            });
            return promise;
        },

        //删除佳作
        deleteFinework: function(id) {
            var info = {
                flag: false,
                message: ""
            };
            var promise = new Promise(function(resolve, reject) {
                DIARY.update({
                    'del_flag': 1
                }, {
                    where: {
                        "id": id
                    }
                }).then(function(result) {
                    info.flag = true;
                    info.message = "删除成功";
                    resolve(info);
                }, function(err) {
                    console.log(err);
                    info.message = "删除失败";
                    reject(info);
                })
            });
            return promise;
        },

        //根据id找到单个佳作
        findFineworkOne: function(id) {
            var info = {
                flag: false,
                message: ""
            };
            var promise = new Promise(function(resolve, reject) {
                DIARY.findOne({
                    attributes: ['id', 'user_id', 'title', 'content', 'comment_num', 'score', 'new_create_time', 'create_time', 'update_time'],
                    where: {
                        id: id
                    }
                }).then(function(result) {
                    if (result) {
                        var data = JSON.parse(JSON.stringify(result));
                        data.new_create_time = moment(data.new_create_time).format("YYYY-MM-DD HH:mm:ss");
                        info.data = data;
                        info.flag = true;
                        info.message = "查找佳作成功";
                        resolve(info);
                    } else {
                        info.message = "查找佳作为空";
                        info.flag = true;
                        info.data = null;
                        resolve(info);
                    }
                }, function(err) {
                    console.log(err);
                    info.message = "数据库连接失败";
                    reject(info);
                })
            });
            return promise;
        },

        //获得评论内容
        getCommentInfo: function(id, page) {
            var info = {
                flag: false,
                message: ""
            };
            var promise = new Promise(function(resolve, reject) {
                var pn = 10;
                page = parseInt(page - 1) * pn;
                sequelize.query('SELECT c.id,c.parent_id,c.user_id,c.content,c.score,c.create_time,c.update_time,b.real_name,b.role_type FROM comment_table c LEFT JOIN user_etzr b on c.user_id = b.user_id where c.parent_id = ? AND c.del_flag=0 ORDER BY c.create_time DESC LIMIT ?,10', {
                    replacements: [id, page],
                    type: sequelize.QueryTypes.SELECT
                }).then(function(result) {
                    if (result.length) {
                        var data = JSON.parse(JSON.stringify(result));
                        for (var i = 0; i < data.length; i++) {
                            data[i].create_time = moment(data[i].create_time).format("YYYY-MM-DD HH:mm:ss");
                        }
                        info.data = data;
                        info.flag = true;
                        info.message = "获取评论成功";
                        resolve(info);
                    } else {
                        info.message = "没有评论了";
                        info.data = null;
                        info.flag = true;
                        resolve(info);
                    }
                }, function(err) {
                    console.log(err);
                    info.message = "数据库连接失败";
                    reject(info);
                })
            });
            return promise;
        },

        //插入评论
        insertComment: function(finework_id, user_id, score, content) {
            var info = {
                flag: false,
                message: ""
            };
            var comment_id = uuid.v4();
            var promise = new Promise(function(resolve, reject) {
                COMMENT.create({
                    'id': comment_id,
                    'user_id': user_id,
                    'parent_id': finework_id,
                    'content': content,
                    'score': score,
                    'del_flag': 0
                }).then(function(result) {
                    info.message = "评论成功";
                    info.flag = true;
                    resolve(info);
                }, function(err) {
                    console.log(err);
                    info.message = "数据库连接失败";
                    reject(info);
                })
            });
            return promise;
        },


        /*更新评论数量和评分人得数量*/
        updateCommentNumAndScore: function(finework_id, newScore, update_flag) {
            var info = {
                flag: false,
                message: ""
            };
            var eva_flag = 0;
            var promise = new Promise(function(resolve, reject) {
                //当用户没有评分时，newScore = 0 ，evaluate_num不加1，反之加1
                if (newScore) {
                    eva_flag = 1;
                }
                /*自增*/
                if (update_flag === "increment") {
                    DIARY.findById(finework_id).then(function(diary) {
                        diary.increment({
                            score: Number(newScore),
                            comment_num: 1, //评论数量加1
                            evaluate_num: eva_flag //评分的人的数量
                        }, {
                            by: 5
                        }).then(function(diary) {
                            info.message = "成功，评分更新成功";
                            info.flag = true;
                            resolve(info);
                        }, function(err) {
                            info.message = "成功，评分更新失败";
                            reject(info);
                        })
                    }, function(err) {
                        console.log(err);
                        info.message = "查找失败";
                        reject(info);
                    })
                } else {
                    //自减
                    DIARY.findById(finework_id).then(function(diary) {
                        diary.increment({
                            score: -Number(newScore),
                            comment_num: -1
                        }, {
                            by: 5
                        }).then(function(diary) {
                            info.message = "成功，评分更新成功";
                            info.flag = true;
                            resolve(info);
                        }, function(err) {
                            console.log(err);
                            info.message = "成功，评分更新失败";
                            reject(info);
                        })
                    }, function(err) {
                        console.log(err);
                        info.message = "查找失败";
                        reject(info);
                    })
                }
            });
            return promise;
        },


        //删除评论
        deleteComment: function(comment_id) {
            var info = {
                flag: false,
                message: ""
            };
            var promise = new Promise(function(resolve, reject) {
                COMMENT.update({
                    'del_flag': 1
                }, {
                    where: {
                        "id": comment_id
                    }
                }).then(function(result) {
                    info.message = "删除成功";
                    info.flag = true;
                    resolve(info);
                }, function() {
                    info.message = "数据库连接失败";
                    reject(info);
                })
            });
            return promise;
        },


        /*****************活动部分**********************/

        //获得活动信息
        getActivityInfo: function(page, order, orderType) {
            var info = {
                flag: false,
                message: ""
            };
            var promise = new Promise(function(resolve, reject) {
                var pn = 10;
                page = parseInt(page - 1) * pn;
                DIARY.findAndCountAll({
                    attributes: ['id', 'user_id', 'content', 'title', 'otherfield', 'thumbsUp_num', 'comment_num', 'new_create_time', 'create_time', 'update_time'],
                    order: [
                        [orderType, order]
                    ],
                    include: [{
                        model: RESOURCE,
                        as: 'imgData',
                        attributes: ['id', 'parent_id', 'resource_url', 'preview_url', 'img_url_L', 'img_url_m', 'img_url_s']
                    }],
                    where: {
                        "del_flag": 0,
                        "post_type": 0
                    },
                    offset: page,
                    limit: pn
                }).then(function(result) {
                    if (result.rows.length) {
                        var data = JSON.parse(JSON.stringify(result));
                        info.data = data.rows;
                        info.flag = true;
                        info.message = "获取活动数据成功";
                        resolve(info);
                    } else {
                        info.message = "查找活动为空";
                        info.flag = true;
                        info.data = null;
                        resolve(info);
                    }
                }, function(err) {
                    console.log(err);
                    info.message = "数据库连接失败";
                    reject(info);
                })
            });
            return promise;
        },

        getActivityUserInfo: function(page, order, orderType) {
            var info = {
                flag: false,
                message: ""
            };
            var promise = new Promise(function(resolve, reject) {
                var pn = 10;
                page = parseInt(page - 1) * pn;
                DIARY.findAndCountAll({
                    attributes: [
                        [sequelize.col('user_etzr.real_name'), 'real_name'],
                        [sequelize.col('user_etzr.role_type'), 'roleType']
                    ],
                    order: [
                        [orderType, order]
                    ],
                    include: [{
                        model: USER,
                        attributes: []
                    }],
                    where: {
                        "del_flag": 0,
                        "post_type": 0
                    },
                    offset: page,
                    limit: pn
                }).then(function(result) {
                    if (result.rows.length) {
                        var data = JSON.parse(JSON.stringify(result));
                        info.data = data.rows;
                        info.flag = true;
                        info.message = "获取活动数据成功";
                        resolve(info);
                    } else {
                        info.message = "查找活动为空";
                        info.flag = true;
                        info.data = null;
                        resolve(info);
                    }
                }, function(err) {
                    console.log(err);
                    info.message = "数据库连接失败";
                    reject(info);
                })
            });
            return promise;
        },

        insertActivity: function(id, user_id, content, add_time, title) {
            var info = {
                flag: false,
                message: ""
            };
            var promise = new Promise(function(resolve, reject) {
                DIARY.create({
                    'id': id,
                    'user_id': user_id,
                    'content': content,
                    'new_create_time': add_time,
                    'post_type': 0,
                    'title': title,
                    'del_flag': 0
                }).then(function(result) {
                    info.message = "添加成功";
                    info.flag = true;
                    resolve(info);
                }, function(err) {
                    console.log(err);
                    info.message = "数据库连接失败";
                    reject(info);
                })
            });
            return promise;
        },



        //删除活动
        deleteActivity: function(id) {
            var info = {
                flag: false,
                message: ""
            };
            var promise = new Promise(function(resolve, reject) {
                DIARY.update({
                    'del_flag': 1
                }, {
                    where: {
                        "id": id
                    }
                }).then(function(result) {
                    info.flag = true;
                    info.message = "删除成功";
                    resolve(info);
                }, function(err) {
                    console.log(err);
                    info.message = "删除失败";
                    reject(info);
                })
            });
            return promise;
        },


        /******************沟通交流部分****************/

        /*添加沟通交流*/
        insertPostcom: function(id, user_id, content, title) {
            var info = {
                flag: false,
                message: ""
            };
            var promise = new Promise(function(resolve, reject) {
                DIARY.create({
                    'id': id,
                    'user_id': user_id,
                    'content': content,
                    'title': title,
                    'post_type': 3,
                    'del_flag': 0
                }).then(function(result) {
                    info.message = "添加成功";
                    info.flag = true;
                    resolve(info);
                }, function(err) {
                    console.log(err);
                    info.message = "数据库连接失败";
                    reject(info);
                })
            });
            return promise;
        },

        //查找帖子和图片
        getPostcomAndImages: function(page, order, orderType) {
            var info = {
                flag: false,
                message: "",
                data: {}
            };
            var promise = new Promise(function(resolve, reject) {
                var pn = 20;
                page = parseInt(page - 1) * pn;
                DIARY.findAndCountAll({
                    attributes: ['id', 'user_id', 'content', 'title', 'otherfield', 'thumbsUp_num', 'comment_num', 'new_create_time', 'create_time', 'update_time'],
                    order: [
                        [orderType, order]
                    ],
                    include: [{
                        model: RESOURCE,
                        as: 'imgData',
                        attributes: ['id', 'parent_id', 'resource_url', 'preview_url', 'img_url_L', 'img_url_m', 'img_url_s']
                    }],
                    where: {
                        "del_flag": 0,
                        "post_type": 3
                    },
                    offset: page,
                    limit: pn
                }).then(function(result) {
                    console.log(JSON.parse(JSON.stringify(result)));
                    if (result.rows.length) {
                        var data = JSON.parse(JSON.stringify(result));
                        console.log(data);
                        info.data = data.rows;
                        info.flag = true;
                        info.message = "获取数据成功";
                        resolve(info);
                    } else {
                        info.message = "查找数据为空";
                        info.flag = true;
                        info.data = null;
                        resolve(info);
                    }
                }, function(err) {
                    console.log(err);
                    info.message = "数据库连接失败";
                    reject(info);
                })
            });
            return promise;
        },



        //获得交流信息,名字和身份
        getPostcomInfo: function(page, order, orderType) {
            var info = {
                flag: false,
                message: "",
                data: {}
            };
            var promise = new Promise(function(resolve, reject) {
                var pn = 20;
                page = parseInt(page - 1) * pn;
                //orderType = 'a.' + orderType;
                DIARY.findAndCountAll({
                    attributes: [
                        [sequelize.col('user_etzr.real_name'), 'real_name'],
                        [sequelize.col('user_etzr.role_type'), 'roleType']
                    ],
                    order: [
                        [orderType, order]
                    ],
                    include: [{
                        model: USER,
                        attributes: []
                    }],
                    where: {
                        "del_flag": 0,
                        "post_type": 3
                    },
                    offset: page,
                    limit: pn
                }).then(function(result) {
                    console.log(JSON.parse(JSON.stringify(result)));
                    if (result.rows.length) {
                        var data = JSON.parse(JSON.stringify(result));
                        console.log(data);
                        info.data = data.rows;
                        info.flag = true;
                        info.message = "获取数据成功";
                        resolve(info);
                    } else {
                        info.message = "查找数据为空";
                        info.flag = true;
                        info.data = null;
                        resolve(info);
                    }
                }, function(err) {
                    console.log(err);
                    info.message = "数据库连接失败";
                    reject(info);
                })
            });
            return promise;
        },

        //删除交流
        deletePostcom: function(id) {
            var info = {
                flag: false,
                message: ""
            };
            var promise = new Promise(function(resolve, reject) {
                DIARY.update({
                    'del_flag': 1
                }, {
                    where: {
                        "id": id
                    }
                }).then(function(result) {
                    info.flag = true;
                    info.message = "删除成功";
                    resolve(info);
                }, function(err) {
                    console.log(err);
                    info.message = "删除失败";
                    reject(info);
                })
            });
            return promise;
        },

        //根据id找到单个交流
        findPostcomOne: function(id) {
            var info = {
                flag: false,
                message: "",
                data: {}
            };
            var promise = new Promise(function(resolve, reject) {
                sequelize.query('SELECT a.id,a.user_id,a.title,a.content,a.otherfield,a.thumbsUp_num,a.new_create_time,a.create_time,a.update_time,a.comment_num,b.real_name,b.role_type FROM postings_table a LEFT JOIN user_etzr b on a.user_id=b.user_id WHERE a.id=?', {
                    replacements: [id],
                    type: sequelize.QueryTypes.SELECT
                }).then(function(result) {
                    console.log(result);
                    if (result.length) {
                        var data = JSON.parse(JSON.stringify(result));
                        data[0].create_time = moment(data[0].create_time).format("YYYY-MM-DD HH:mm:ss");
                        info.data = data[0];
                        info.flag = true;
                        info.message = "获取数据成功";
                        resolve(info);
                    } else {
                        info.message = "查找数据为空";
                        info.data = null;
                        info.flag = true;
                        resolve(info);
                    }
                }, function(err) {
                    console.log(err);
                    info.message = "数据库连接失败";
                    reject(info);
                })
            });
            return promise;
        },

        //得到评论
        getPostcomCommentInfo: function(id, page) {
            var info = {
                flag: false,
                message: ""
            };
            var promise = new Promise(function(resolve, reject) {
                var pn = 10;
                page = parseInt(page - 1) * pn;
                sequelize.query('SELECT c.id,c.parent_id,c.user_id,c.content,c.score,c.create_time,c.update_time,b.real_name,b.role_type FROM comment_table c LEFT JOIN user_etzr b on c.user_id = b.user_id where c.parent_id = ? AND c.del_flag=0 ORDER BY c.create_time DESC LIMIT ?,10', {
                    replacements: [id, page],
                    type: sequelize.QueryTypes.SELECT
                }).then(function(result) {
                    if (result.length) {
                        var data = JSON.parse(JSON.stringify(result));
                        for (var i = 0; i < data.length; i++) {
                            data[i].create_time = moment(data[i].create_time).format("YYYY-MM-DD HH:mm:ss");
                        }
                        info.data = data;
                        info.flag = true;
                        info.message = "获取评论成功";
                        resolve(info);
                    } else {
                        info.message = "没有评论了";
                        info.data = null;
                        info.flag = true;
                        resolve(info);
                    }
                }, function(err) {
                    info.message = "数据库连接失败";
                    reject(info);
                })
            });
            return promise;
        },

        //插入评论
        insertPostcomComment: function(postcom_id, user_id, content) {
            var info = {
                flag: false,
                message: ""
            };
            var comment_id = uuid.v4();
            var promise = new Promise(function(resolve, reject) {
                COMMENT.create({
                    'id': comment_id,
                    'user_id': user_id,
                    'parent_id': postcom_id,
                    'content': content,
                    'del_flag': 0
                }).then(function(result) {
                    info.message = "评论添加成功";
                    info.flag = true;
                    resolve(info);
                }, function(err) {
                    console.log(err);
                    info.message = "数据库连接失败";
                    reject(info);
                })
            });
            return promise;
        },

        //更新评论数
        updatePostcomCommentNum: function(postcom_id, update_flag) {
            var info = {
                flag: false,
                message: ""
            };
            var promise = new Promise(function(resolve, reject) {
                if (update_flag === "increment") {
                    DIARY.findById(postcom_id).then(function(diary) {
                        diary.increment({
                            comment_num: 1 //评论数量加1
                        }, {
                            by: 5
                        }).then(function(diary) {
                            info.message = "评论数更新成功";
                            info.flag = true;
                            resolve(info);
                        }, function(err) {
                            info.message = "评论数更新失败";
                            reject(info);
                        })
                    }, function(err) {
                        console.log(err);
                        info.message = "查找失败";
                        reject(info);
                    })
                } else {
                    //自减
                    DIARY.findById(postcom_id).then(function(diary) {
                        diary.increment({
                            comment_num: -1
                        }, {
                            by: 5
                        }).then(function(diary) {
                            info.message = "评论数更新成功";
                            info.flag = true;
                            resolve(info);
                        }, function(err) {
                            console.log(err);
                            info.message = "评论数更新失败";
                            reject(info);
                        })
                    }, function(err) {
                        console.log(err);
                        info.message = "查找失败";
                        reject(info);
                    })
                }
            });
            return promise;
        },


        //删除评论
        deletePostcomComment: function(comment_id) {
            var info = {
                flag: false,
                message: ""
            };
            var promise = new Promise(function(resolve, reject) {
                COMMENT.update({
                    'del_flag': 1
                }, {
                    where: {
                        "id": comment_id
                    }
                }).then(function(result) {
                    info.message = "删除评论成功";
                    info.flag = true;
                    resolve(info);
                }, function(err) {
                    console.log(err);
                    info.message = "数据库连接失败";
                    reject(info);
                })
            });
            return promise;
        },

        /********************教师模块*************************/
        /*添加日记*/
        insertTeacher: function(id, name, school, content) {
            var info = {
                flag: false,
                message: ""
            };
            var promise = new Promise(function(resolve, reject) {
                DIARY.create({
                    'id': id,
                    'title': name,
                    'otherfield': school,
                    'content': content,
                    'post_type': 4,
                    'del_flag': 0
                }).then(function(result) {
                    info.message = "教师添加成功";
                    info.flag = true;
                    resolve(info);
                }, function(err) {
                    console.log(err);
                    info.message = "数据库连接失败";
                    reject(info);
                })
            });
            return promise;
        },

        //获得交流信息
        getTeacherInfo: function(page, order, orderType) {
            var info = {
                flag: false,
                message: "",
                data: {}
            };
            var promise = new Promise(function(resolve, reject) {
                var pn = 9;
                page = parseInt(page - 1) * pn;
                DIARY.findAndCountAll({
                    attributes: ['id', 'user_id', 'content', 'title', 'otherfield', 'thumbsUp_num', 'comment_num', 'new_create_time', 'create_time', 'update_time'],
                    order: [
                        [orderType, order]
                    ],
                    include: [{
                        model: RESOURCE,
                        as: 'imgData',
                        attributes: ['id', 'parent_id', 'resource_url', 'preview_url', 'img_url_L', 'img_url_m', 'img_url_s']
                    }],
                    where: {
                        "del_flag": 0,
                        "post_type": 4
                    },
                    offset: page,
                    limit: pn
                }).then(function(result) {
                    if (result.rows.length) {
                        var data = JSON.parse(JSON.stringify(result));
                        console.log(data);
                        info.data = data.rows;
                        info.flag = true;
                        info.message = "获取数据成功";
                        resolve(info);
                    } else {
                        info.message = "查找数据为空";
                        info.flag = true;
                        info.data = null;
                        resolve(info);
                    }
                }, function(err) {
                    console.log(err);
                    info.message = "数据库连接失败";
                    reject(info);
                })
            });
            return promise;
        },

        //个人中心获取日记数（sql语句查询方式）
        /*getUserDiaryNum: function(user_id) {
            var info = {
                flag: false,
                message: "",
                data: {}
            };
            var promise = new Promise(function(resolve, reject) {
                sequelize.query('SELECT count(*) FROM postings_table p LEFT JOIN user_etzr u ON p.user_id = u.user_id WHERE p.post_type = 1 AND p.del_flag = 0 AND p.user_id = ?', {
                    replacements: [user_id],
                    type: sequelize.QueryTypes.SELECT
                }).then(function(result) {
                    console.log(result);
                    info.data = result[0]["count(*)"];
                    info.message = "查找数量成功";
                    info.flag = true;
                    console.log(info);
                    resolve(info);
                }, function(err) {
                    console.log(err);
                    info.message = "数据库连接失败";
                    reject(info);
                })
            });
            return promise;
        },*/

        //个人中心获取日记数（sequelize的API）
        getUserDiaryNum: function(user_id) {
            var info = {
                flag: false,
                message: "",
                data: {}
            };
            var promise = new Promise(function(resolve, reject) {
                DIARY.count({
                    where: {
                        "post_type": 1,
                        "del_flag": 0,
                        "user_id": user_id
                    },
                    include: [{
                        model: USER
                    }],
                }).then(function(result) {
                    console.log(result);
                    info.flag = true;
                    info.message = "查询用户日记数成功";
                    info.data = result;
                    console.log(info);
                    resolve(info);
                }, function(err) {
                    console.log(err);
                    info.message = "数据库连接失败";
                    reject(info);
                })
            });
            return promise;
        },


        //个人中心获取发帖数
        getUserPostNum: function(user_id) {
            var info = {
                flag: false,
                message: "",
                data: {}
            };
            var promise = new Promise(function(resolve, reject) {
                DIARY.count({
                    where: {
                        "post_type": 3,
                        "del_flag": 0,
                        "user_id": user_id
                    },
                    include: [{
                        model: USER
                    }],
                }).then(function(result) {
                    console.log(result);
                    info.flag = true;
                    info.message = "查询用户发帖数成功";
                    info.data = result;
                    console.log(info);
                    resolve(info);
                }, function(err) {
                    console.log(err);
                    info.message = "数据库连接失败";
                    reject(info);
                })
            });
            return promise;
        },

        //个人中心获取回帖数
        getUserCommentNum: function(user_id) {
            var info = {
                flag: false,
                message: "",
                data: {}
            };
            var promise = new Promise(function(resolve, reject) {
                COMMENT.count({
                    where: {
                        "del_flag": 0,
                        "user_id": user_id
                    },
                    include: [{
                        model: USER
                    }],
                }).then(function(result) {
                    console.log(result);
                    info.flag = true;
                    info.message = "查询用户评论数成功";
                    info.data = result;
                    console.log(info);
                    resolve(info);
                }, function(err) {
                    console.log(err);
                    info.message = "数据库连接失败";
                    reject(info);
                })
            });
            return promise;
        },

    }
    /*---------------方法---------------*/


/*---------------导出---------------*/
module.exports = diarySqlFun