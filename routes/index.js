var express = require('express');
var path = require('path');
var router = express.Router();
var upload = require('./upload');
var uuid = require('uuid')
var moment = require('moment');
var co = require('co');
var request = require('request');
var imagesFun = require('./assets/lib/compress_images');
var diarySqlFun = require('./assets/sql/diary_sql');
// 此文件仅用作开发html生成
var redis = require('./assets/lib/redis.js');
var config = require(path.join(__dirname, '../config'));
var uploadPath = path.join(__dirname, '../uploads/');
var ums_url = config.umsApiConfig.ums_url;

//首页
router.get('/', function(req, res, next) {
	if (!req.session.user) {
		res.redirect('/etzr_services/admin_login');
	} else {
		res.render('index', {
			title: "hello",
			user_id: req.session.user,
			token: req.session.token,
			url: "/etzr_services",
			staticUrl: "/etzr_services/static"
		});
	}
});

/*登录*/
router.post('/login', function(req, res, next) {
	var info = {
		flag: false,
		message: "",
		data: {}
	};
	var studentId = req.body.username;
	var passWord = req.body.password;
	/*向用户管理api发送登录验证*/
	request.post({
		url: ums_url + '/user/login',
		body: {
			"mobile": "",
			"passWord": passWord,
			"loginName": studentId,
			"systemCode": "ebook",
			"verifyCode": ""
		},
		json: true
	}, function optionalCallback(err, httpResponse, body) {
		if (err) {
			console.error('error:', err);
			info.message = "向api服务器发送ajax出错";
			res.send(info);
		} else {
			console.log(body);
			//登录失败情况
			if (!body.userInfo) {
				info.message = body.description;
				res.send(info);
				//登录成功情况
			} else {
				info.flag = true;
				info.message = "登录成功";
				var user_id = body.userInfo.userId;
				/*用户名*/
				var nikeName = body.userInfo.nickName;
				var roleType = body.userInfo.roleType;
				var token = body.token.token;
				var userData = {
					user_id: "",
					name: "",
					roleType: ""
				};
				userData.user_id = user_id;
				userData.name = nikeName;
				userData.roleType = roleType;
				info.data.userData = userData;
				info.data.token = token;
				/*过期时间*/
				var expiresIn = body.token.expiresIn;
				var systemCode = "ebook";
				/*登录并且查找信息成功，查找user_etzr表，如果
				有该用户的信息，就执行更新操作，更新user_etzr用户表
				该用户的信息，如果查不到，则将该用户的id和真实名
				插入user_etzr表	
				*/
				diarySqlFun.findUserOne(user_id).then(function(data0) {
					co(function*() {
						if (data0.data) {
							//如果能查询到数据，执行更新
							yield diarySqlFun.updateUser(user_id, nikeName, roleType).then(function(data1) {
								//更新成功
							}, function(data1) {
								//更新失败
								info.message = data1.message;
								res.send(info);
							})
						} else {
							//不能查询到数据，即初次登录，将信息插入user_etzr表
							yield diarySqlFun.insertUser(user_id, nikeName, roleType).then(function(data2) {
								//插入成功
							}, function(data2) {
								info.message = data2.message;
								res.send(info);
							})
						}
					})
				}, function(data0) {
					info.message = data0.message;
					res.send(info);
				});

				console.log(parseInt(expiresIn / 1000));
				//产生session
				req.session.user = user_id;
				req.session.token = token;
				//将token存入redis
				redis.setData(user_id, token, parseInt(expiresIn / 1000));
				console.log(info);
				res.send(info);
				/*redis.getData(user_id).then(function(result){
					console.log(result);
				});*/
			}
		}
	});
});

/*自动登录*/
router.post('/autoLogin', function(req, res, next) {
	var info = {
		message: "",
		flag: false,
		data: {}
	};
	var token = req.body.token;
	var user_id = req.body.user_id;
	var systemCode = "ebook";
	request.post({
		url: ums_url + '/token/validateToken',
		form: {
			"systemCode": systemCode,
			"userId": user_id,
			"token": token
		}
	}, function optionalCallback(err, httpResponse, body) {
		if (err) {
			console.error('error:', err);
			info.message = "向api服务器发送ajax出错";
			res.send(info);
		} else {
			console.log("验证token：message:", body);
			var result = JSON.stringify(body.code);
			if (!result) {
				/*验证成功刷新token*/
				request.post({
					url: ums_url + '/token/refreshToken',
					form: {
						"systemCode": systemCode,
						"userId": user_id,
						"token": token
					}
				}, function optionalCallback(err, httpResponse, body2) {
					if (err) {
						console.error('error:', err);
						info.message = "向api服务器发送ajax出错";
						res.send(info);
					} else {
						console.log("刷新token：message:", body2);
						var data = JSON.parse(body2);
						var new_token = data.token;
						if (!new_token) {
							info.message = "token刷新失败";
							res.send(info);
						} else {
							var new_expiresIn = data.expiresIn;
							info.data.token = new_token;
							info.data.user_id = user_id;
							info.flag = true;
							info.message = "自动登录成功";
							req.session.user = user_id;
							req.session.token = token;
							redis.setData(user_id, new_token, parseInt(new_expiresIn / 1000));
							res.send(info);
						}
					}
				})
			} else {
				info.message = "验证失败";
				res.send(info);
			}
		}
	});
});

/*注销*/
router.post('/logout', function(req, res, next) {
	var user_id = req.body.user_id;
	var token = req.body.token;
	var info = {
		message: "",
		flag: false
	};

	request.post({
		url: ums_url + '/user/loginOut',
		form: {
			"systemCode": "ebook",
			"userId": user_id,
			"token": token
		}
	}, function optionalCallback(err, httpResponse, body) {
		if (err) {
			console.error('error:', err);
			info.message = "向api服务器发送ajax出错";
			res.send(info);
		} else {
			if (!body.code) {
				//注销成功
				info.flag = true;
				info.message = "注销登录成功";
				req.session.destroy();
				res.send(info);
			} else {
				info.message = body.description;
				res.send(info);
			}
		}
	})
});


/*退出登录*/
router.get('/admin/logout', function(req, res, next) {
	var info = {
		message: "",
		flag: false
	};
	info.message = "退出成功";
	req.session.user = null;
	req.session.token = null;
	res.send(info);
});

router.post('/admin/register', function (req, res, next) {
	var info = {
		message: "",
		flag: false
	};
	var username = req.body.username;
	var password = req.body.password;
	request.post({
		url: ums_url + '/register/userRegister',
		body: {
			"confirmPassword": password,
			"mobile": "",
			"password": password,
			"loginName": username,
			"systemCode": "ebook",
			"verifyCode": ""
		},
		json: true
	}, function optionalCallback(err, httpResponse, body) {
		if (err) {
			return console.error('error:', err)
			info.message = "注册失败";
			res.send(info);
		} else {
			console.log("httpResponse:", JSON.parse(JSON.stringify(httpResponse)));
			if (!body.code) {
				info.message = "注册成功";
				info.flag = true;
				res.send(info);
			} else {
				info.message = "注册失败";
				res.send(info);
			}
		}
	});
});

router.get('/diary', function(req, res, next) {
	if (!req.session.user) {
		res.redirect('/etzr_services/admin_login');
	} else {
		res.render('diary', {
			title: "hello",
			user_id: req.session.user,
			token: req.session.token,
			url: "/etzr_services",
			staticUrl: "/etzr_services/static"
		});
	}
});


router.get('/diarylook', function(req, res, next) {
	res.render('diarylook', {
		title: "hello",
		user_id: req.session.user,
		token: req.session.token,
		url: "/etzr_services",
		staticUrl: "/etzr_services/static"
	});
});

router.get('/finework', function(req, res, next) {
	if (!req.session.user) {
		res.redirect('/etzr_services/admin_login');
	} else {
		res.render('finework', {
			title: "hello",
			user_id: req.session.user,
			token: req.session.token,
			url: "/etzr_services",
			staticUrl: "/etzr_services/static"
		});
	}
});

//活动
router.get('/activity', function(req, res, next) {
	if (!req.session.user) {
		res.redirect('/etzr_services/admin_login');
	} else {
		res.render('activity', {
			title: "hello",
			user_id: req.session.user,
			token: req.session.token,
			url: "/etzr_services",
			staticUrl: "/etzr_services/static"
		});
	}
});

//沟通交流
router.get('/postcom', function(req, res, next) {
	if (!req.session.user) {
		res.redirect('/etzr_services/admin_login');
	} else {
		res.render('postcom', {
			title: "hello",
			user_id: req.session.user,
			token: req.session.token,
			url: "/etzr_services",
			staticUrl: "/etzr_services/static"
		});
	}
});

//教师模块
router.get('/teacher', function(req, res, next) {
	if (!req.session.user) {
		res.redirect('/etzr_services/admin_login');
	} else {
		res.render('teacher', {
			title: "hello",
			user_id: req.session.user,
			token: req.session.token,
			url: "/etzr_services",
			staticUrl: "/etzr_services/static"
		});
	}
});

router.get('/admin_login', function(req, res, next) {
	res.render('login', {
		title: "hello",
		url: "/etzr_services",
		staticUrl: "/etzr_services/static"
	});
});

router.get('/jump', function(req, res, next) {
	if (!req.session.user) {
		res.redirect('/etzr_services/admin_login');
	} else {
		res.render('jump', {
			title: "hello",
			user_id: req.session.user,
			token: req.session.token,
			url: "/etzr_services",
			staticUrl: "/etzr_services/static"
		});
	}
});

router.get('/register', function(req, res, next) {
	res.render('register', {
		title: "hello",
		url: "/etzr_services",
		staticUrl: "/etzr_services/static"
	});
})

//日记列表页（审核通过和未通过）
router.post('/diary/list', function(req, res, next) {
	var page = req.body.page;
	var order = req.body.order;
	var orderType = req.body.orderType;
	var pass_flag = req.body.pass_flag;
	var user_id = req.body.user_id;
	/*前端传过来的token值*/
	var local_token = req.body.token;
	var info = {
		flag: false,
		message: "",
		data: {}
	};
	/*redis存取的token*/
	redis.getData(user_id).then(function(result) {
		console.log(result);
		var redis_token = result;
		/*将前端传过来的本地存储的token与redis里的token对比*/
		if (local_token !== redis_token || !redis_token) {
			info.message = "token不正确，请重新登录";
			res.send(info);
		} else {
			diarySqlFun.getDiaryAndImages(page, order, orderType, pass_flag).then(function(data) {
				if (data.data) {
					co(function*() {
						var obj = data.data;
						var nameData;
						yield diarySqlFun.getDiaryInfo(page, order, orderType, pass_flag).then(function(data2) {
							nameData = data2.data;
						}, function(data2) {
							info.message = data2.message;
							res.send(info);
						});
						//查询到的日记数量
						yield diarySqlFun.getDiaryCount(pass_flag).then(function(data0) {
							var count = data0.count;
							info.count = count;
							var pageNum = Math.ceil(count / 10);
							info.pageNum = pageNum;
						}, function(data0) {
							info.message = data0.message;
							res.send(info);
						});
						for (var i = 0; i < obj.length; i++) {
							obj[i].roleType = nameData[i].roleType;
							obj[i].real_name = nameData[i].real_name;
							obj[i].create_time = moment(obj[i].create_time).format("YYYY-MM-DD HH:mm:ss");
							obj[i].new_create_time = moment(obj[i].new_create_time).format("YYYY-MM-DD HH:mm:ss");
							obj[i].update_time = moment(obj[i].update_time).format("YYYY-MM-DD HH:mm:ss");
							var diaryId = obj[i].id;
							var likeStatus = 1;
							obj[i].likeStatus = likeStatus;
							yield diarySqlFun.getLikeStatus(user_id, diaryId).then(function(data1) {
								if (data1.data) {
									obj[i].likeStatus = 0;
								} else {
									obj[i].likeStatus = 1;
								}
							}, function(data1) {
								info.message = data1.message;
								res.send(info)
							});
						}
						info.data = obj;
						info.message = data.message;
						info.flag = true;
						res.send(info);
					})
				} else {
					info.flag = true;
					info.message = data.message;
					info.data = null;
					res.send(info);
				}

			}, function(data) {
				info.message = data.message;
				res.send(info);
			})
		}
	})

});

router.post('/diary/single', function(req, res, next) {
	var id = req.body.id;
	var user_id = req.body.user_id;
	var local_token = req.body.token;
	var info = {
		flag: false,
		message: "",
		data: {}
	};
	/*redis存取的token*/
	redis.getData(user_id).then(function(result) {
		console.log(result);
		var redis_token = result;
		/*将前端传过来的本地存储的token与redis里的token对比*/
		if (local_token !== redis_token || !redis_token) {
			info.message = "token不正确，请重新登录";
			res.send(info);
		} else {
			diarySqlFun.findDiaryOne(id).then(function(data0) {
				if (data0.data) {
					co(function*() {
						var data = data0.data;
						yield diarySqlFun.getLikeStatus(user_id, id).then(function(data1) {
							if (data1.data) {
								data.likeStatus = 0;
							} else {
								data.likeStatus = 1;
							}
						}, function(data1) {
							info.message = data1.message;
							res.send(info)
						});
						yield diarySqlFun.getImgInfo(id).then(function(data2) {
							var imgData = data2.data;
							info.flag = true;
							data.imgData = imgData;
							info.message = data0.message;
							info.data = data;
							res.send(info);
						}, function(data2) {
							info.message = data2.message;
							res.send(info);
						});
					})
				} else {
					info.flag = true;
					info.message = data0.message;
					info.data = null;
					res.send(info);
				}
			}, function(data0) {
				info.message = data0.message;
				res.send(info);
			})
		}
	})

});


/*点赞*/
router.post('/diary/like', function(req, res, next) {
	var parent_id = req.body.id;
	var user_id = req.body.user_id;
	var id = uuid.v4();
	var local_token = req.body.token;
	var info = {
		flag: false,
		message: ""
	};
	/*redis存取的token*/
	redis.getData(user_id).then(function(result) {
		console.log(result);
		var redis_token = result;
		/*将前端传过来的本地存储的token与redis里的token对比*/
		if (local_token !== redis_token || !redis_token) {
			info.message = "token不正确，请重新登录";
			res.send(info);
		} else {
			diarySqlFun.addThumbsUp(id, parent_id, user_id).then(function(data) {
				co(function*() {
					var update_flag = "increment";
					yield diarySqlFun.updateThNum(parent_id, update_flag).then(function(data) {
						info.message = "点赞成功";
						info.flag = true;
						res.send(info);
					}, function(data) {
						info.message = "点赞失败，更新点赞数失败";
						res.send(info);
					})
				})
			}, function(data) {
				info.message = "点赞失败，发生错误";
				res.send(info);
			})
		}
	})
});


/*取消点赞*/
router.post('/diary/cancellike', function(req, res, next) {
	var parent_id = req.body.id;
	var user_id = req.body.user_id;
	var local_token = req.body.token;
	var info = {
		flag: false,
		message: ""
	};
	/*redis存取的token*/
	redis.getData(user_id).then(function(result) {
		console.log(result);
		var redis_token = result;
		/*将前端传过来的本地存储的token与redis里的token对比*/
		if (local_token !== redis_token || !redis_token) {
			info.message = "token不正确，请重新登录";
			res.send(info);
		} else {
			diarySqlFun.deleteThumbsUp(parent_id, user_id).then(function(data) {
				co(function*() {
					var update_flag = "decrement";
					yield diarySqlFun.updateThNum(parent_id, update_flag).then(function(data) {
						info.message = "取消点赞成功";
						info.flag = true;
						res.send(info);
					}, function(data) {
						info.message = "取消点赞失败";
						res.send(info);
					})
				})
			}, function(data) {
				info.message = "取消点赞失败，发生错误";
				res.send(info);
			})
		}
	})
});

/*添加日记*/
router.post('/diary/add', function(req, res, next) {
	upload(req, res, function(err) {
		var info = {
			message: "",
			flag: false
		};
		/*redis存取的token*/
		var data = req.body;
		var id = uuid.v4();
		var user_id = data["userid"];
		var local_token = req.body.token;
		console.log(local_token);
		var content = data["content"];
		var weather = data["weather"];
		var add_time = data["add_time"];
		var roleType = data["roleType"];
		var pass_flag;
		redis.getData(user_id).then(function(result) {
			console.log(result);
			var redis_token = result;
			/*将前端传过来的本地存储的token与redis里的token对比*/
			if (local_token !== redis_token || !redis_token) {
				info.message = "token不正确，请重新登录";
				res.send(info);
			} else {
				//如果是老师、pass_flag = 1 直接通过
				if (roleType === '2') {
					pass_flag = 1
				} else {
					//学生、pass_flag = 1，经老师在后台审核通过后变为1、才可以显示
					pass_flag = 0
				}
				var fileArr = [];
				for (var i = 0; i < req.files.length; i++) {
					var filename = req.files[i].filename;
					var resource_url = '/etzr_services/img/' + filename;
					/*如果是图片*/
					if (req.files[i].mimetype === "image/jpeg" || req.files[i].mimetype === "image/png") {
						var trueFilePath = uploadPath + filename;
						//获取图片宽高
						var images_url = imagesFun.compress_images(filename, trueFilePath);
						var img_id = uuid.v4();
						fileArr.push({
							'id': img_id,
							'parent_id': id,
							'resource_url': resource_url,
							'img_url_L': images_url.img_url_L,
							'preview_url': images_url.preview_url,
							'img_url_m': images_url.img_url_m,
							'img_url_s': images_url.img_url_s
						});
					} else {
						var img_id = uuid.v4();
						fileArr.push({
							'id': img_id,
							'parent_id': id,
							'resource_url': resource_url
						});
					}

				}
				diarySqlFun.insertFile(fileArr).then(function(data) {
					return diarySqlFun.insertDiary(id, user_id, content, weather, add_time, pass_flag).then(function(data) {
						info.message = data.message;
						info.flag = true;
						res.send(info);
					}, function(data) {
						info.message = data.message;
						res.send(info);
					})
				}, function(data) {
					info.message = data.message;
					res.send(info);
				})
			}
		})
	});
});


//日记排行榜
router.post('/diary/rankList', function(req, res, next) {
	var user_id = req.body.user_id;
	var local_token = req.body.token;
	var page = 1;
	var order = "DESC";
	var orderType = "thumbsUp_num";
	var info = {
		flag: false,
		message: "",
		data: {}
	};
	/*redis存取的token*/
	redis.getData(user_id).then(function(result) {
		console.log(result);
		var redis_token = result;
		/*将前端传过来的本地存储的token与redis里的token对比*/
		if (local_token !== redis_token || !redis_token) {
			info.message = "token不正确，请重新登录";
			res.send(info);
		} else {
			diarySqlFun.getDiaryAndImages(page, order, orderType, 1).then(function(data) {
				if (data.data) {
					co(function*() {
						var obj = data.data;
						var nameData;
						//一次性查出日记作者名，在for循环里处理
						yield diarySqlFun.getDiaryInfo(page, order, orderType, 1).then(function(data2) {
							nameData = data2.data;
						}, function(data2) {
							info.message = data2.message;
							res.send(info);
						})
						for (var i = 0; i < obj.length; i++) {
							//循环插入日记作者名
							obj[i].roleType = nameData[i].roleType;
							obj[i].real_name = nameData[i].real_name;
							obj[i].new_create_time = moment(obj[i].new_create_time).format("YYYY-MM-DD HH:mm:ss");
							var diaryId = obj[i].id;
							var likeStatus = 1;
							obj[i].likeStatus = likeStatus;
							yield diarySqlFun.getLikeStatus(user_id, diaryId).then(function(data1) {
								if (data1.data) {
									obj[i].likeStatus = 0;
								} else {
									obj[i].likeStatus = 1;
								}
							}, function(data1) {
								info.message = data1.message;
								res.send(info)
							});

						}
						info.message = data.message;
						info.flag = true;
						info.data = obj;
						res.send(info);
					})
				} else {
					info.message = data.message;
					info.flag = true;
					info.data = data.data;
					res.send(info);
				}
			}, function(data) {
				info.message = data.message;
				res.send(info);
			})
		}
	})
});



//删除日记，根据id
router.post('/diary/delete', function(req, res, next) {
	var id = req.body.id;
	var user_id = req.body.user_id;
	var local_token = req.body.token;
	var info = {
		flag: false,
		message: ""
	};
	/*redis存取的token*/
	redis.getData(user_id).then(function(result) {
		console.log(result);
		var redis_token = result;
		/*将前端传过来的本地存储的token与redis里的token对比*/
		if (local_token !== redis_token || !redis_token) {
			info.message = "token不正确，请重新登录";
			res.send(info);
		} else {
			diarySqlFun.deleteDiary(id).then(function(data) {
				info.message = data.message;
				info.flag = data.flag;
				res.send(info);
			}, function(data) {
				info.message = data.message;
				res.send(info);
			})
		}
	})
});

//通过审核
router.post('/diary/pass', function(req, res, next) {
	var id = req.body.id;
	var user_id = req.body.user_id;
	var local_token = req.body.token;
	var info = {
		flag: false,
		message: ""
	};
	/*redis存取的token*/
	redis.getData(user_id).then(function(result) {
		console.log(result);
		var redis_token = result;
		/*将前端传过来的本地存储的token与redis里的token对比*/
		if (local_token !== redis_token || !redis_token) {
			info.message = "token不正确，请重新登录";
			res.send(info);
		} else {
			diarySqlFun.updatePassFlag(id).then(function(data) {
				info.message = data.message;
				info.flag = data.flag;
				res.send(info);
			}, function(data) {
				info.message = data.message;
				res.send(info);
			})
		}
	})
});

//浏览日记  下一篇 上一篇 当前时间最近
router.post('/diary/look', function(req, res, next) {
	var Time = req.body.time;
	var user_id = req.body.user_id;
	var flag = req.body.flag;
	var local_token = req.body.token;
	var info = {
		flag: false,
		message: "",
		data: {}
	};
	/*redis存取的token*/
	redis.getData(user_id).then(function(result) {
		console.log(result);
		var redis_token = result;
		/*将前端传过来的本地存储的token与redis里的token对比*/
		if (local_token !== redis_token || !redis_token) {
			info.message = "token不正确，请重新登录";
			res.send(info);
		} else {
			if (flag === "next") {
				diarySqlFun.diaryLookNext(Time).then(function(data0) {
					if (data0.data) {
						co(function*() {
							var data = data0.data;
							var count;
							yield diarySqlFun.getDiaryCount('1').then(function(data4) {
								count = data4.count;
							}, function(data4) {
								info.message = data4.message;
								res.send(info);
							});
							for (var i = 0; i < data.length; i++) {
								var id = data[i].id;
								data[i].totalNum = count;
								yield diarySqlFun.getDiaryNum(id).then(function(data3) {
									console.log(data3);
									data[i].singleNum = data3.data;
								}, function(data3) {
									info.message = data3.message;
									res.send(info);
								})
								yield diarySqlFun.getLikeStatus(user_id, id).then(function(data1) {
									if (data1.data) {
										data[i].likeStatus = 0;
									} else {
										data[i].likeStatus = 1;
									}
								}, function(data1) {
									info.message = data1.message;
									res.send(info);
								});
								yield diarySqlFun.getImgInfo(id).then(function(data2) {
									var imgData = data2.data;
									data[i].imgData = imgData;
								}, function(data2) {
									info.message = data2.message;
									res.send(info);
								});
							}
							info.flag = true;
							info.message = data0.message;
							info.data = data;
							res.send(info);
						})
					} else {
						info.message = data0.message;
						info.flag = true;
						info.data = data0.data;
						res.send(info);
					}
				}, function(data0) {
					info.message = data0.message;
					res.send(info);
				})
			} else if (flag === "prev") {
				diarySqlFun.diaryLookPrev(Time).then(function(data0) {
					if (data0.data) {
						co(function*() {
							var data = data0.data;
							var count;
							yield diarySqlFun.getDiaryCount('1').then(function(data4) {
								count = data4.count;
							}, function(data4) {
								info.message = data4.message;
								res.send(info);
							});
							for (var i = 0; i < data.length; i++) {
								var id = data[i].id;
								data[i].totalNum = count;
								yield diarySqlFun.getDiaryNum(id).then(function(data3) {
									console.log(data3);
									data[i].singleNum = data3.data;
								}, function(data3) {
									info.message = data3.message;
									res.send(info);
								})
								yield diarySqlFun.getLikeStatus(user_id, id).then(function(data1) {
									if (data1.data) {
										data[i].likeStatus = 0;
									} else {
										data[i].likeStatus = 1;
									}
								}, function(data1) {
									info.message = data1.message;
									res.send(info);
								});
								yield diarySqlFun.getImgInfo(id).then(function(data2) {
									var imgData = data2.data;
									data[i].imgData = imgData;
								}, function(data2) {
									info.message = data2.message;
									res.send(info);
								});
							}
							info.flag = true;
							info.message = data0.message;
							info.data = data;
							res.send(info);
						})
					} else {
						info.message = data0.message;
						info.flag = true;
						info.data = data0.data;
						res.send(info);
					}
				}, function(data0) {
					info.message = data0.message;
					res.send(info);
				})
			} else if (flag === "now") {
				diarySqlFun.diaryLookNow(Time).then(function(data0) {
					if (data0.data) {
						co(function*() {
							var data = data0.data;
							var count;
							yield diarySqlFun.getDiaryCount('1').then(function(data4) {
								count = data4.count;
							}, function(data4) {
								info.message = data4.message;
								res.send(info);
							});
							for (var i = 0; i < data.length; i++) {
								var id = data[i].id;
								data[i].totalNum = count;
								yield diarySqlFun.getDiaryNum(id).then(function(data3) {
									console.log(data3);
									data[i].singleNum = data3.data;
								}, function(data3) {
									info.message = data3.message;
									res.send(info);
								})
								yield diarySqlFun.getLikeStatus(user_id, id).then(function(data1) {
									if (data1.data) {
										data[i].likeStatus = 0;
									} else {
										data[i].likeStatus = 1;
									}
								}, function(data1) {
									info.message = data1.message;
									res.send(info);
								});
								yield diarySqlFun.getImgInfo(id).then(function(data2) {
									var imgData = data2.data;
									data[i].imgData = imgData;
								}, function(data2) {
									info.message = data2.message;
									res.send(info);
								});
							}
							info.message = data0.message;
							info.flag = true;
							info.data = data;
							res.send(info);
						})
					} else {
						info.message = data0.message;
						info.flag = true;
						info.data = data0.data;
						res.send(info);
					}
				}, function(data0) {
					info.message = data0.message;
					res.send(info);
				})
			}
		}
	})
});

//获得传入年月的当月几号有日记
router.post('/diary/month/day', function(req, res, next) {
	var info = {
		flag: false,
		message: "",
		data: {}
	};
	//点击日历传的日期
	var year = req.body.year;
	var month = req.body.month;
	var user_id = req.body.user_id;
	var local_token = req.body.token;
	redis.getData(user_id).then(function(result) {
		var redis_token = result;
		/*将前端传过来的本地存储的token与redis里的token对比*/
		if (local_token !== redis_token || !redis_token) {
			info.message = "token不正确，请重新登录";
			res.send(info);
		} else {
			diarySqlFun.getMonthDiary(year, month).then(function(data1) {
				console.log(data1);
				info.data = data1.data;
				info.flag = true;
				info.message = data1.message;
				res.send(info);
			}, function(data1) {
				info.message = data1.message;
				res.send(info);
			})
		}
	});
});

//日记第几篇
router.post('/diary/single/num', function(req, res, next) {
	var info = {
		flag: false,
		message: "",
		data: {}
	};
	//点击日历传的日期
	var id = req.body.id;
	var user_id = req.body.user_id;
	var local_token = req.body.token;
	redis.getData(user_id).then(function(result) {
		var redis_token = result;
		/*将前端传过来的本地存储的token与redis里的token对比*/
		if (local_token !== redis_token || !redis_token) {
			info.message = "token不正确，请重新登录";
			res.send(info);
		} else {
			diarySqlFun.getDiaryNum(id).then(function(data1) {
				console.log(data1);
				info.data = data1.data;
				info.flag = true;
				info.message = data1.message;
				res.send(info);
			}, function(data1) {
				info.message = data1.message;
				res.send(info);
			})
		}
	});

});



/*添加佳作*/
router.post('/finework/add', function(req, res, next) {
	upload(req, res, function(err) {
		var info = {
			message: "",
			flag: false
		};
		var data = req.body;
		var id = uuid.v4();
		var user_id = data["userid"];
		var local_token = req.body.token;
		var title = data["title"];
		var content = data["content"];
		var add_time = data["add_time"];
		var fileArr = [];
		redis.getData(user_id).then(function(result) {
			var redis_token = result;
			/*将前端传过来的本地存储的token与redis里的token对比*/
			if (local_token !== redis_token || !redis_token) {
				info.message = "token不正确，请重新登录";
				res.send(info);
			} else {
				for (var i = 0; i < req.files.length; i++) {
					var filename = req.files[i].filename;
					var resource_url = '/etzr_services/img/' + filename;
					/*如果是图片*/
					if (req.files[i].mimetype === "image/jpeg" || req.files[i].mimetype === "image/png") {
						var trueFilePath = uploadPath + filename;
						//获取图片宽高
						var images_url = imagesFun.compress_images(filename, trueFilePath);
						var img_id = uuid.v4();
						fileArr.push({
							'id': img_id,
							'parent_id': id,
							'resource_url': resource_url,
							'img_url_L': images_url.img_url_L,
							'preview_url': images_url.preview_url,
							'img_url_m': images_url.img_url_m,
							'img_url_s': images_url.img_url_s
						});
					} else {
						var img_id = uuid.v4();
						fileArr.push({
							'id': img_id,
							'parent_id': id,
							'resource_url': resource_url
						});
					}

				}

				diarySqlFun.insertFile(fileArr).then(function(data) {
					return diarySqlFun.insertFinework(id, user_id, title, content, add_time).then(function(data) {
						info.message = data.message;
						info.flag = true;
						res.send(info);
					}, function(data) {
						info.message = data.message;
						res.send(info);
					})
				}, function(data) {
					info.message = data.message;
					res.send(info);
				})
			}
		});
	})
});


//佳作列表 分页
router.post('/finework/list', function(req, res, next) {
	var page = req.body.page;
	var year = req.body.year;
	var time = year + '-01-01';
	var user_id = req.body.user_id;
	var local_token = req.body.token;
	var info = {
		flag: false,
		message: "",
		data: {}
	};
	/*redis存取的token*/
	redis.getData(user_id).then(function(result) {
		var redis_token = result;
		/*将前端传过来的本地存储的token与redis里的token对比*/
		if (local_token !== redis_token || !redis_token) {
			info.message = "token不正确，请重新登录";
			res.send(info);
		} else {
			diarySqlFun.getFineworkInfo(page, time).then(function(data0) {
					if (data0.data) {
						co(function*() {
							var nameData;
							yield diarySqlFun.getFineworkUserInfo(page, time).then(function(data2) {
								nameData = data2.data;
							}, function(data2) {
								info.message = data2.message;
								res.send(info);
							})
							yield diarySqlFun.getFineworkCount(time).then(function(data1) {
								var count = data1.count;
								var pageNum = Math.ceil(count / 9);
								info.pageNum = pageNum;
							}, function(data1) {
								info.message = data1.message;
								res.send(info);
							});
							var data = data0.data;
							for (var i = 0; i < data.length; i++) {
								data[i].roleType = nameData[i].roleType;
								data[i].real_name = nameData[i].real_name;
								data[i].create_time = moment(data[i].create_time).format("YYYY-MM-DD HH:mm:ss");
								data[i].new_create_time = moment(data[i].new_create_time).format("YYYY-MM-DD HH:mm:ss");
								data[i].update_time = moment(data[i].update_time).format("YYYY-MM-DD HH:mm:ss");
							}
							info.flag = true;
							info.message = data0.message;
							info.data = data;
							console.log(info);
							res.send(info);
						})
					} else {
						info.data = data0.data;
						info.flag = true;
						info.message = data0.message;
						res.send(info);
					}
				},
				function(data0) {
					info.message = data0.message;
					res.send(info);
				});
		}
	});

});


//佳作详情页，根据佳作id获取佳作信息、图片、评论
router.post('/finework/single', function(req, res, next) {
	var id = req.body.id;
	var user_id = req.body.user_id;
	/*前端传过来的token值*/
	var local_token = req.body.token;
	var info = {
		flag: false,
		message: "",
		data: {}
	};
	/*redis存取的token*/
	redis.getData(user_id).then(function(result) {
		console.log(result);
		var redis_token = result;
		/*将前端传过来的本地存储的token与redis里的token对比*/
		if (local_token !== redis_token || !redis_token) {
			info.message = "token不正确，请重新登录";
			res.send(info);
		} else {
			diarySqlFun.findFineworkOne(id).then(function(data0) {
				info.data = data0.data;
				if (data0.data) {
					co(function*() {
						yield diarySqlFun.getImgInfo(id).then(function(data1) {
							var imgData = data1.data;
							info.data.imgData = imgData;
						}, function(data1) {
							info.message = data1.message;
							res.send(info);
						});
						var page = 1;
						yield diarySqlFun.getCommentInfo(id, page).then(function(data2) {
							info.data.commentData = data2.data;
							info.message = data0.message;
							info.flag = true;
							console.log(info);
							res.send(info);
						}, function(data2) {
							info.message = data2.message;
							res.send(info);
						})
					})
				} else {
					info.flag = true;
					info.message = data0.message;
					info.data = data0.data;
					res.send(info);
				}
			}, function(data0) {
				info.message = data0.message;
				res.send(info);
			})
		}
	})
});

//添加评论
router.post('/finework/addcomment', function(req, res, next) {
	var finework_id = req.body.finework_id;
	var user_id = req.body.user_id;
	var score = req.body.score;
	var content = req.body.content;
	var user_id = req.body.user_id;
	/*前端传过来的token值*/
	var local_token = req.body.token;
	var info = {
		flag: false,
		message: "",
		data: {}
	};
	/*redis存取的token*/
	redis.getData(user_id).then(function(result) {
		console.log(result);
		var redis_token = result;
		/*将前端传过来的本地存储的token与redis里的token对比*/
		if (local_token !== redis_token || !redis_token) {
			info.message = "token不正确，请重新登录";
			res.send(info);
		} else {
			diarySqlFun.insertComment(finework_id, user_id, score, content).then(function(data1) {
				co(function*() {
					function getCurrentTime() {
						var date = new Date(); //当前时间
						var month = date.getMonth() + 1; //月
						var day = date.getDate(); //日
						if (month >= 1 && month <= 9) {
							month = "0" + month;
						}
						if (day >= 0 && day <= 9) {
							day = "0" + day;
						}
						//当前日期
						var curTime = date.getFullYear() + "-" + month + "-" + day + " " + date.getHours() + ":" + date.getMinutes() + ":" + date.getSeconds();
						return curTime;
					}
					var nowTime = getCurrentTime();
					info.message = data1.message;
					var update_flag = "increment";
					yield diarySqlFun.updateCommentNumAndScore(finework_id, score, update_flag).then(function(data2) {
						info.message = data2.message;
						info.flag = true;
						info.data.finework_id = finework_id;
						info.data.user_id = user_id;
						info.data.score = score;
						info.data.content = content;


						info.data.create_time = nowTime;
						res.send(info);
					}, function(data2) {
						info.message = data2.message;
						res.send(info);
					});
				})
			}, function(data1) {
				info.message = data1.message;
				res.send(info);
			})
		}
	});
});

//删除佳作
router.post('/finework/delete', function(req, res, next) {
	var id = req.body.id;
	var user_id = req.body.user_id;
	/*前端传过来的token值*/
	var local_token = req.body.token;
	var info = {
		flag: false,
		message: ""
	};
	/*redis存取的token*/
	redis.getData(user_id).then(function(result) {
		console.log(result);
		var redis_token = result;
		/*将前端传过来的本地存储的token与redis里的token对比*/
		if (local_token !== redis_token || !redis_token) {
			info.message = "token不正确，请重新登录";
			res.send(info);
		} else {
			diarySqlFun.deleteDiary(id).then(function(data) {
				info.message = data.message;
				info.flag = data.flag;
				res.send(info);
			}, function(data) {
				info.message = data.message;
				res.send(info);
			})
		}
	});
});

//评论列表
router.post('/finework/listComment', function(req, res, next) {
	var page = req.body.page;
	var finework_id = req.body.finework_id;
	var user_id = req.body.user_id;
	/*前端传过来的token值*/
	var local_token = req.body.token;
	var info = {
		flag: false,
		message: "",
		data: {}
	};
	/*redis存取的token*/
	redis.getData(user_id).then(function(result) {
		console.log(result);
		var redis_token = result;
		/*将前端传过来的本地存储的token与redis里的token对比*/
		if (local_token !== redis_token || !redis_token) {
			info.message = "token不正确，请重新登录";
			res.send(info);
		} else {
			diarySqlFun.getCommentInfo(finework_id, page).then(function(data) {
				if (data.data) {
					info.data = data.data;
					info.message = data.message;
					info.flag = true;
					res.send(info);
				} else {
					info.data = null;
					info.message = data.message;
					info.flag = true;
					res.send(info);
				}
			}, function(data) {
				info.message = data.message;
				res.send(info);
			});
		}
	});
});

//删除评论
router.post('/finework/comment/delete', function(req, res, next) {
	var comment_id = req.body.id;
	//删除评论的得分
	var oneScore = req.body.oneScore;
	var finework_id = req.body.finework_id;
	var user_id = req.body.user_id;
	/*前端传过来的token值*/
	var local_token = req.body.token;
	var info = {
		flag: false,
		message: ""
	};
	/*redis存取的token*/
	redis.getData(user_id).then(function(result) {
		console.log(result);
		var redis_token = result;
		/*将前端传过来的本地存储的token与redis里的token对比*/
		if (local_token !== redis_token || !redis_token) {
			info.message = "token不正确，请重新登录";
			res.send(info);
		} else {
			var update_flag = "decrement";
			diarySqlFun.deleteComment(comment_id).then(function(data) {
				info.message = data.message;
				co(function*() {
					yield diarySqlFun.updateCommentNumAndScore(finework_id, oneScore, update_flag).then(function(data1) {
						info.message = data1.message;
						info.flag = true;
						res.send(info);
					}, function(data1) {
						info.message = data2.message;
						res.send(info);
					})
				})
			}, function(data) {
				info.message = data.message;
				res.send(info);
			})
		}
	});
});


//添加活动
router.post('/activity/add', function(req, res, next) {
	upload(req, res, function(err) {
		var info = {
			message: "",
			flag: false
		};
		var data = req.body;
		var id = uuid.v4();
		var user_id = data["userid"];
		var local_token = req.body.token;
		var content = data["content"];
		var add_time = data["add_time"];
		var title = data["title"];
		var fileArr = [];
		redis.getData(user_id).then(function(result) {
			var redis_token = result;
			/*将前端传过来的本地存储的token与redis里的token对比*/
			if (local_token !== redis_token || !redis_token) {
				info.message = "token不正确，请重新登录";
				res.send(info);
			} else {
				for (var i = 0; i < req.files.length; i++) {
					var filename = req.files[i].filename;
					var resource_url = '/etzr_services/img/' + filename;
					/*如果是图片*/
					if (req.files[i].mimetype === "image/jpeg" || req.files[i].mimetype === "image/png") {
						var trueFilePath = uploadPath + filename;
						//获取图片宽高
						var images_url = imagesFun.compress_images(filename, trueFilePath);
						var img_id = uuid.v4();
						fileArr.push({
							'id': img_id,
							'parent_id': id,
							'resource_url': resource_url,
							'img_url_L': images_url.img_url_L,
							'preview_url': images_url.preview_url,
							'img_url_m': images_url.img_url_m,
							'img_url_s': images_url.img_url_s
						});
					} else {
						var img_id = uuid.v4();
						fileArr.push({
							'id': img_id,
							'parent_id': id,
							'resource_url': resource_url
						});
					}
				}
				diarySqlFun.insertFile(fileArr).then(function(data) {
					return diarySqlFun.insertActivity(id, user_id, content, add_time, title).then(function(data) {
						info.message = data.message;
						info.flag = true;
						res.send(info);
					}, function(data) {
						info.message = data.message;
						res.send(info);
					})
				}, function(data) {
					info.message = data.message;
					res.send(info);
				})
			}
		});

	})
});

//活动列表
router.post('/activity/list', function(req, res, next) {
	var page = req.body.page;
	var orderType = req.body.orderType;
	var order = req.body.order;
	var user_id = req.body.user_id;
	/*前端传过来的token值*/
	var local_token = req.body.token;
	var info = {
		flag: false,
		message: "",
		data: {}
	};
	/*redis存取的token*/
	redis.getData(user_id).then(function(result) {
		console.log(result);
		var redis_token = result;
		/*将前端传过来的本地存储的token与redis里的token对比*/
		if (local_token !== redis_token || !redis_token) {
			info.message = "token不正确，请重新登录";
			res.send(info);
		} else {
			diarySqlFun.getActivityInfo(page, order, orderType).then(function(data) {
					if (data.data) {
						co(function*() {
							var nameData;
							yield diarySqlFun.getActivityUserInfo(page, order, orderType).then(function(data2) {
								nameData = data2.data;
								console.log(nameData);
							}, function(data2) {
								info.message = data2.message;
								res.send(info);
							})
							yield diarySqlFun.getCount("0").then(function(data0) {
								var count = data0.count;
								var pageNum = Math.ceil(count / 10);
								info.pageNum = pageNum;
							}, function(data0) {
								info.message = data0.message;
								res.send(info);
							});
							var obj = data.data;
							for (var i = 0; i < obj.length; i++) {
								obj[i].roleType = nameData[i].roleType;
								obj[i].real_name = nameData[i].real_name;
								obj[i].new_create_time = moment(obj[i].new_create_time).format("YYYY-MM-DD HH:mm:ss");
								obj[i].create_time = moment(obj[i].create_time).format("YYYY-MM-DD HH:mm:ss");
								obj[i].update_time = moment(obj[i].update_time).format("YYYY-MM-DD HH:mm:ss");
							}
							info.flag = true;
							info.message = data.message;
							info.data = obj;
							res.send(info);
						})
					} else {
						info.flag = true;
						info.message = data.message;
						info.data = data.data;
						res.send(info);
					}
				},
				function(data) {
					info.message = data.message;
					res.send(info);
				});
		}
	});
});


//删除活动
router.post('/activity/delete', function(req, res, next) {
	var id = req.body.id;
	var user_id = req.body.user_id;
	/*前端传过来的token值*/
	var local_token = req.body.token;
	var info = {
		flag: false,
		message: ""
	};
	/*redis存取的token*/
	redis.getData(user_id).then(function(result) {
		console.log(result);
		var redis_token = result;
		/*将前端传过来的本地存储的token与redis里的token对比*/
		if (local_token !== redis_token || !redis_token) {
			info.message = "token不正确，请重新登录";
			res.send(info);
		} else {
			diarySqlFun.deleteActivity(id).then(function(data) {
				info.message = data.message;
				info.flag = data.flag;
				res.send(info);
			}, function(data) {
				info.message = data.message;
				info.flag = data.flag;
				res.send(info);
			})
		}
	});

});


//发布帖子
router.post('/postcom/add', function(req, res, next) {
	upload(req, res, function(err) {
		var info = {
			message: "",
			flag: false
		};
		var data = req.body;
		var id = uuid.v4();
		var user_id = data["userid"];
		var local_token = req.body.token;
		var content = data["content"];
		var title = data["title"];
		var fileArr = [];
		redis.getData(user_id).then(function(result) {
			var redis_token = result;
			/*将前端传过来的本地存储的token与redis里的token对比*/
			if (local_token !== redis_token || !redis_token) {
				info.message = "token不正确，请重新登录";
				res.send(info);
			} else {
				for (var i = 0; i < req.files.length; i++) {
					var filename = req.files[i].filename;
					var resource_url = '/etzr_services/img/' + filename;
					/*如果是图片*/
					if (req.files[i].mimetype === "image/jpeg" || req.files[i].mimetype === "image/png") {
						var trueFilePath = uploadPath + filename;
						//获取图片宽高
						var images_url = imagesFun.compress_images(filename, trueFilePath);
						var img_id = uuid.v4();
						fileArr.push({
							'id': img_id,
							'parent_id': id,
							'resource_url': resource_url,
							'img_url_L': images_url.img_url_L,
							'preview_url': images_url.preview_url,
							'img_url_m': images_url.img_url_m,
							'img_url_s': images_url.img_url_s
						});
					} else {
						var img_id = uuid.v4();
						fileArr.push({
							'id': img_id,
							'parent_id': id,
							'resource_url': resource_url
						});
					}
				}
				diarySqlFun.insertFile(fileArr).then(function(data) {
					return diarySqlFun.insertPostcom(id, user_id, content, title).then(function(data) {
						info.message = data.message;
						info.flag = true;
						res.send(info);
					}, function(data) {
						info.message = data.message;
						res.send(info);
					})
				}, function(data) {
					info.message = data.message;
					res.send(info);
				})
			}
		});
	})
});

//删除帖子
router.post('/postcom/delete', function(req, res, next) {
	var id = req.body.id;
	var user_id = req.body.user_id;
	/*前端传过来的token值*/
	var local_token = req.body.token;
	var info = {
		flag: false,
		message: ""
	};
	/*redis存取的token*/
	redis.getData(user_id).then(function(result) {
		console.log(result);
		var redis_token = result;
		/*将前端传过来的本地存储的token与redis里的token对比*/
		if (local_token !== redis_token || !redis_token) {
			info.message = "token不正确，请重新登录";
			res.send(info);
		} else {
			diarySqlFun.deletePostcom(id).then(function(data) {
				info.message = data.message;
				info.flag = data.flag;
				res.send(info);
			}, function(data) {
				info.message = data.message;
				info.flag = data.flag;
				res.send(info);
			})
		}
	})
});

//帖子列表
router.post('/postcom/list', function(req, res, next) {
	var page = req.body.page;
	var order = req.body.order;
	var orderType = req.body.orderType;
	var user_id = req.body.user_id;
	/*前端传过来的token值*/
	var local_token = req.body.token;
	var info = {
		flag: false,
		message: "",
		data: {}
	};
	/*redis存取的token*/
	redis.getData(user_id).then(function(result) {
		console.log(result);
		var redis_token = result;
		/*将前端传过来的本地存储的token与redis里的token对比*/
		if (local_token !== redis_token || !redis_token) {
			info.message = "token不正确，请重新登录";
			res.send(info);
		} else {
			diarySqlFun.getPostcomAndImages(page, order, orderType).then(function(data) {
					if (data.data) {
						co(function*() {
							var obj = data.data;
							var nameData;
							yield diarySqlFun.getPostcomInfo(page, order, orderType).then(function(data1) {
								nameData = data1.data;
							}, function(data1) {
								info.message = data1.message;
								res.send(info);
							});
							yield diarySqlFun.getCount("3").then(function(data0) {
								var count = data0.count;
								var pageNum = Math.ceil(count / 20);
								info.pageNum = pageNum;
							}, function(data0) {
								info.message = data0.message;
								res.send(info);
							});
							for (var i = 0; i < obj.length; i++) {
								obj[i].real_name = nameData[i].real_name;
								obj[i].roleType = nameData[i].roleType;
								obj[i].create_time = moment(obj[i].create_time).format("YYYY-MM-DD HH:mm:ss");
								obj[i].new_create_time = moment(obj[i].new_create_time).format("YYYY-MM-DD HH:mm:ss");
								obj[i].update_time = moment(obj[i].update_time).format("YYYY-MM-DD HH:mm:ss");
							}
							info.message = data.message;
							info.flag = true;
							info.data = obj;
							res.send(info);
						})
					} else {
						info.data = null;
						info.flag = true;
						info.message = data.message;
						res.send(info);
					}
				},
				function(data) {
					info.message = data.message;
					res.send(info);
				});
		}
	});
});


//添加评论
router.post('/postcom/addcomment', function(req, res, next) {
	var id = req.body.postid;
	var postcom_id = req.body.postcom_id;
	var content = req.body.content;
	var user_id = req.body.user_id;
	/*前端传过来的token值*/
	var local_token = req.body.token;
	var info = {
		flag: false,
		message: ""
	};
	/*redis存取的token*/
	redis.getData(user_id).then(function(result) {
		console.log(result);
		var redis_token = result;
		/*将前端传过来的本地存储的token与redis里的token对比*/
		if (local_token !== redis_token || !redis_token) {
			info.message = "token不正确，请重新登录";
			res.send(info);
		} else {
			if (id) {
				//回复评论的情况
				diarySqlFun.insertPostcomComment(id, user_id, content).then(function(data1) {
					co(function*() {
						info.message = data1.message;
						var update_flag = "increment";
						yield diarySqlFun.updatePostcomCommentNum(postcom_id, update_flag).then(function(data2) {
							info.message = data2.message;
							info.flag = true;
							res.send(info);
						}, function(data2) {
							info.message = data2.message;
							res.send(info);
						});
					})
				}, function(data1) {
					info.message = data1.message;
					res.send(info);
				})
			} else {
				//评论帖子的情况
				diarySqlFun.insertPostcomComment(postcom_id, user_id, content).then(function(data1) {
					co(function*() {
						info.message = data1.message;
						var update_flag = "increment";
						yield diarySqlFun.updatePostcomCommentNum(postcom_id, update_flag).then(function(data2) {
							info.message = data1.message;
							info.flag = true;
							res.send(info);
						}, function(data2) {
							info.message = data2.message;
							res.send(info);
						});
					})
				}, function(data1) {
					info.message = data1.message;
					res.send(info);
				})
			}
		}
	});
});



//帖子详情页
router.post('/postcom/single', function(req, res, next) {
	var id = req.body.id;
	var user_id = req.body.user_id;
	/*前端传过来的token值*/
	var local_token = req.body.token;
	var info = {
		flag: false,
		message: ""
	};
	/*redis存取的token*/
	redis.getData(user_id).then(function(result) {
		console.log(result);
		var redis_token = result;
		/*将前端传过来的本地存储的token与redis里的token对比*/
		if (local_token !== redis_token || !redis_token) {
			info.message = "token不正确，请重新登录";
			res.send(info);
		} else {
			diarySqlFun.findPostcomOne(id).then(function(data0) {
				var commentData;
				info.data = data0.data;
				if (data0.data) {
					co(function*() {
						yield diarySqlFun.getImgInfo(id).then(function(data1) {
							var imgData = data1.data;
							info.data.imgData = imgData;
						}, function(data1) {
							info.message = data1.message;
							res.send(info);
						});
						var page = 1;
						yield diarySqlFun.getPostcomCommentInfo(id, page).then(function(data2) {
							var commentData = data2.data;
							info.data.commentData = commentData;
						}, function(data2) {
							info.message = data2.message;
							res.send(info);
						})
						if (!info.data.commentData) {
							info.data.commentData = null;
						} else {
							for (var i = 0; i < info.data.commentData.length; i++) {
								yield diarySqlFun.getPostcomCommentInfo(info.data.commentData[i].id, page).then(function(data3) {
									var replyData = data3.data;
									info.data.commentData[i].replyData = replyData;
								}, function(data3) {
									info.message = data3.message;
									res.send(info);
								})
							}
						}
						info.flag = true;
						info.message = data0.message;
						res.send(info);
					})
				} else {
					info.message = data0.message;
					info.flag = true;
					info.data = data0.data;
					res.send(info);
				}
			}, function(data0) {
				info.message = data0.message;
				res.send(info);
			})
		}
	});
});



//评论列表  分页
router.post('/postcom/listComment', function(req, res, next) {
	var page = req.body.page;
	var postcom_id = req.body.postcom_id;
	var user_id = req.body.user_id;
	/*前端传过来的token值*/
	var local_token = req.body.token;
	var info = {
		flag: false,
		message: "",
		data: {}
	};
	/*redis存取的token*/
	redis.getData(user_id).then(function(result) {
		console.log(result);
		var redis_token = result;
		/*将前端传过来的本地存储的token与redis里的token对比*/
		if (local_token !== redis_token || !redis_token) {
			info.message = "token不正确，请重新登录";
			res.send(info);
		} else {
			diarySqlFun.getPostcomCommentInfo(postcom_id, page).then(function(data) {
				co(function*() {
					if (data.data) {
						var commentData = data.data;
						for (var i = 0; i < commentData.length; i++) {
							yield diarySqlFun.getPostcomCommentInfo(commentData[i].id, page).then(function(data1) {
								var replyData = data1.data;
								commentData[i].replyData = replyData;
							}, function(data1) {
								info.message = data1.message;
								res.send(info);
							})
						}
						info.data = commentData;
						info.message = data.message;
						info.flag = true;
						res.send(info);
					} else {
						info.data = data.data;
						info.message = data.message;
						info.flag = true;
						res.send(info);
					}
				});
			}, function(data) {
				info.message = data.message;
				res.send(info);
			})
		}
	});
});

//删除评论
router.post('/postcom/comment/delete', function(req, res, next) {
	var comment_id = req.body.id;
	var postcom_id = req.body.postcom_id;
	var user_id = req.body.user_id;
	/*前端传过来的token值*/
	var local_token = req.body.token;
	var info = {
		flag: false,
		message: ""
	};
	/*redis存取的token*/
	redis.getData(user_id).then(function(result) {
		console.log(result);
		var redis_token = result;
		/*将前端传过来的本地存储的token与redis里的token对比*/
		if (local_token !== redis_token || !redis_token) {
			info.message = "token不正确，请重新登录";
			res.send(info);
		} else {
			diarySqlFun.deletePostcomComment(comment_id).then(function(data) {
				info.message = data.message;
				var update_flag = "decrement";
				co(function*() {
					yield diarySqlFun.updatePostcomCommentNum(postcom_id, update_flag).then(function(data1) {
						info.message = data1.message;
						info.flag = true;
						res.send(info);
					}, function(data1) {
						info.message = data1.message;
						res.send(info);
					});
				})
			}, function(data) {
				info.message = data.message;
				res.send(info);
			})
		}
	});
});

/********************************教师模块*****************************/
router.post('/teacher/add', function(req, res, next) {
	upload(req, res, function(err) {
		var info = {
			message: "",
			flag: false
		};
		var data = req.body;
		var id = uuid.v4();
		var user_id = data["userid"];
		var local_token = req.body.token;
		var name = data["name"];
		var school = data["school"];
		var content = data["content"];
		var fileArr = [];
		redis.getData(user_id).then(function(result) {
			var redis_token = result;
			/*将前端传过来的本地存储的token与redis里的token对比*/
			if (local_token !== redis_token || !redis_token) {
				info.message = "token不正确，请重新登录";
				res.send(info);
			} else {
				for (var i = 0; i < req.files.length; i++) {
					var filename = req.files[i].filename;
					var resource_url = '/etzr_services/img/' + filename;
					/*如果是图片*/
					if (req.files[i].mimetype === "image/jpeg" || req.files[i].mimetype === "image/png") {
						var trueFilePath = uploadPath + filename;
						//获取图片宽高
						var images_url = imagesFun.compress_images(filename, trueFilePath);
						var img_id = uuid.v4();
						fileArr.push({
							'id': img_id,
							'parent_id': id,
							'resource_url': resource_url,
							'img_url_L': images_url.img_url_L,
							'preview_url': images_url.preview_url,
							'img_url_m': images_url.img_url_m,
							'img_url_s': images_url.img_url_s
						});
					} else {
						var img_id = uuid.v4();
						fileArr.push({
							'id': img_id,
							'parent_id': id,
							'resource_url': resource_url
						});
					}

				}
				diarySqlFun.insertFile(fileArr).then(function(data) {
					return diarySqlFun.insertTeacher(id, name, school, content).then(function(data) {
						info.message = data.message;
						info.flag = true;
						res.send(info);
					}, function(data) {
						info.message = data.message;
						res.send(info);
					})
				}, function(data) {
					info.message = data.message;
					res.send(info);
				})
			}
		});


	});
});

router.post('/teacher/list', function(req, res, next) {
	var page = req.body.page;
	var user_id = req.body.user_id;
	var orderType = req.body.orderType;
	var order = req.body.order;
	var user_id = req.body.user_id;
	/*前端传过来的token值*/
	var local_token = req.body.token;
	var info = {
		flag: false,
		message: "",
		data: {}
	};
	/*redis存取的token*/
	redis.getData(user_id).then(function(result) {
		console.log(result);
		var redis_token = result;
		/*将前端传过来的本地存储的token与redis里的token对比*/
		if (local_token !== redis_token || !redis_token) {
			info.message = "token不正确，请重新登录";
			res.send(info);
		} else {
			diarySqlFun.getTeacherInfo(page, order, orderType).then(function(data) {
				if (data.data) {
					co(function*() {
						yield diarySqlFun.getCount("4").then(function(data0) {
							var count = data0.count;
							var pageNum = Math.ceil(count / 10);
							info.pageNum = pageNum;
						}, function(data0) {
							info.message = data0.message;
							res.send(info);
						});
						var obj = data.data;
						for (var i = 0; i < obj.length; i++) {
							obj[i].create_time = moment(obj[i].create_time).format("YYYY-MM-DD HH:mm:ss");
							obj[i].new_create_time = moment(obj[i].new_create_time).format("YYYY-MM-DD HH:mm:ss");
							obj[i].update_time = moment(obj[i].update_time).format("YYYY-MM-DD HH:mm:ss");
							var diaryId = obj[i].id;
							var likeStatus = 1;
							obj[i].likeStatus = likeStatus;
							yield diarySqlFun.getLikeStatus(user_id, diaryId).then(function(data1) {
								if (data1.data) {
									obj[i].likeStatus = 0;
								} else {
									obj[i].likeStatus = 1;
								}
							}, function(data1) {
								info.message = data1.message;
								res.send(info)
							});
						}
						info.data = obj;
						info.message = data.message;
						info.flag = true;
						res.send(info);
					})
				} else {
					info.flag = true;
					info.message = data.message;
					info.data = null;
					res.send(info);
				}
			}, function(data) {
				info.message = data.message;
				res.send(info);
			})
		}
	});
});

router.post('/teacher/like', function(req, res, next) {
	//教师id
	var parent_id = req.body.id;
	//点赞记录id
	var id = uuid.v4();
	var user_id = req.body.user_id;
	/*前端传过来的token值*/
	var local_token = req.body.token;
	var info = {
		flag: false,
		message: ""
	};
	/*redis存取的token*/
	redis.getData(user_id).then(function(result) {
		console.log(result);
		var redis_token = result;
		/*将前端传过来的本地存储的token与redis里的token对比*/
		if (local_token !== redis_token || !redis_token) {
			info.message = "token不正确，请重新登录";
			res.send(info);
		} else {
			diarySqlFun.addThumbsUp(id, parent_id, user_id).then(function(data) {
				co(function*() {
					var update_flag = "increment";
					yield diarySqlFun.updateThNum(parent_id, update_flag).then(function(data) {
						info.message = "点赞成功";
						info.flag = true;
						res.send(info);
					}, function(data) {
						info.message = "点赞失败，更新点赞数失败";
						res.send(info);
					})
				})
			}, function(data) {
				info.message = "点赞失败，发生错误";
				res.send(info);
			})
		}
	});
});

router.post('/teacher/cancellike', function(req, res, next) {
	//老师id
	var parent_id = req.body.id;
	var user_id = req.body.user_id;
	/*前端传过来的token值*/
	var local_token = req.body.token;
	var info = {
		flag: false,
		message: ""
	};
	/*redis存取的token*/
	redis.getData(user_id).then(function(result) {
		console.log(result);
		var redis_token = result;
		/*将前端传过来的本地存储的token与redis里的token对比*/
		if (local_token !== redis_token || !redis_token) {
			info.message = "token不正确，请重新登录";
			res.send(info);
		} else {
			diarySqlFun.deleteThumbsUp(parent_id, user_id).then(function(data) {
				co(function*() {
					var update_flag = "decrement";
					yield diarySqlFun.updateThNum(parent_id, update_flag).then(function(data) {
						info.message = "取消点赞成功";
						info.flag = true;
						res.send(info);
					}, function(data) {
						info.message = "取消点赞失败";
						res.send(info);
					})
				})
			}, function(data) {
				info.message = "取消点赞失败，发生错误";
				res.send(info);
			})
		}
	});
});


router.post('/teacher/delete', function(req, res, next) {
	var id = req.body.id;
	var user_id = req.body.user_id;
	/*前端传过来的token值*/
	var local_token = req.body.token;
	var info = {
		flag: false,
		message: ""
	};
	/*redis存取的token*/
	redis.getData(user_id).then(function(result) {
		console.log(result);
		var redis_token = result;
		/*将前端传过来的本地存储的token与redis里的token对比*/
		if (local_token !== redis_token || !redis_token || !redis_token) {
			info.message = "token不正确，请重新登录";
			res.send(info);
		} else {
			diarySqlFun.deleteDiary(id).then(function(data) {
				info.message = data.message;
				info.flag = data.flag;
				res.send(info);
			}, function(data) {
				info.message = data.message;
				res.send(info);
			})
		}
	});
});


//获取用户日记、发帖、回帖数量
router.post('/user/num', function(req, res, next) {
	var user_id = req.body.user_id;
	/*前端传过来的token值*/
	var local_token = req.body.token;
	var info = {
		flag: false,
		message: "",
		data: {}
	};
	/*redis存取的token*/
	redis.getData(user_id).then(function(result) {
		console.log(result);
		var redis_token = result;
		/*将前端传过来的本地存储的token与redis里的token对比*/
		if (local_token !== redis_token || !redis_token || !redis_token) {
			info.message = "token不正确，请重新登录";
			res.send(info);
		} else {
			diarySqlFun.getUserDiaryNum(user_id).then(function(data1) {
				co(function*() {
					//日记数
					var diaryNum = data1.data;
					info.data.diaryNum = diaryNum;
					yield diarySqlFun.getUserPostNum(user_id).then(function(data2) {
						//发帖数
						var postNum = data2.data;
						info.data.postNum = postNum;
					}, function(data2) {
						info.message = data2.message;
						res.send(info);
					});
					yield diarySqlFun.getUserCommentNum(user_id).then(function(data3) {
						//回帖数
						var commentNum = data3.data;
						info.data.commentNum = commentNum;
					}, function(data3) {
						info.message = data3.message;
						res.send(info);
					});
					info.flag = true;
					info.message = "查询日记、发帖、回帖数成功";
					res.send(info);
				})
			}, function(data1) {
				info.message = data1.message;
				res.send(info);
			})
		}
	});
});


module.exports = router;