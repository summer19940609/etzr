var images = require("images");
var path = require('path')
var uploadPath = path.join(__dirname, '../../../uploads/')
var imagesFun = {
	compress_images: function (filename, filePath) {
		var picFileSize = images(filePath).size();
		var picFileWidth = picFileSize.width; //宽
		var picFileHeight = picFileSize.height; //高
		console.log("图片宽：" + picFileWidth + "图片高：" + picFileHeight);
		var resource_url = '/etzr_services/img/' + filename;
		/*压缩逻辑*/
		var preview_url; //预览图
		var img_url_L; //大图
		var img_url_m; //中图
		var img_url_s; //小图
		var image_url = {
			"img_url_L": "",
			"img_url_m": "",
			"img_url_s": "",
			"preview_url": ""
		};
		var compressedSizeAndNameAndPath = {
			"name": {
				"L": "L_" + filename, //大
				"M": "M_" + filename, //中
				"S": "S_" + filename, //小
				"P": "P_" + filename //预览
			},
			"path": {
				"L": uploadPath + "L_" + filename, //大
				"M": uploadPath + "M_" + filename, //中
				"S": uploadPath + "S_" + filename, //小
				"P": uploadPath + "P_" + filename //预览
			},
			"size": {
				"L": "1024", //大
				"M": "600", //中
				"S": "200", //小
				"P": "800" //预览
			}
		};

		if (picFileWidth >= 1024) {
			/*图片宽大于等于1024*/
			images(filePath).resize(1024, picFileHeight * 1024 / picFileWidth).save(compressedSizeAndNameAndPath.path.L, {
				operation: 50
			});
			images(filePath).resize(800, picFileHeight * 800 / picFileWidth).save(compressedSizeAndNameAndPath.path.P, {
				operation: 50
			});
			images(filePath).resize(600, picFileHeight * 600 / picFileWidth).save(compressedSizeAndNameAndPath.path.M, {
				operation: 50
			});
			images(filePath).resize(200, picFileHeight * 200 / picFileWidth).save(compressedSizeAndNameAndPath.path.S, {
				operation: 50
			});
			image_url.img_url_L = '/etzr_services/img/' + compressedSizeAndNameAndPath.name.L;
			image_url.preview_url = '/etzr_services/img/' + compressedSizeAndNameAndPath.name.P;
			image_url.img_url_m = '/etzr_services/img/' + compressedSizeAndNameAndPath.name.M;
			image_url.img_url_s = '/etzr_services/img/' + compressedSizeAndNameAndPath.name.S;
			return image_url;;
		} else {
			if (picFileWidth >= 800) {
				images(filePath).resize(800, picFileHeight * 800 / picFileWidth).save(compressedSizeAndNameAndPath.path.P, {
					operation: 50
				});
				images(filePath).resize(600, picFileHeight * 600 / picFileWidth).save(compressedSizeAndNameAndPath.path.M, {
					operation: 50
				});
				images(filePath).resize(200, picFileHeight * 200 / picFileWidth).save(compressedSizeAndNameAndPath.path.S, {
					operation: 50
				});
				image_url.img_url_L = resource_url;
				image_url.preview_url = '/etzr_services/img/' + compressedSizeAndNameAndPath.name.P;
				image_url.img_url_m = '/etzr_services/img/' + compressedSizeAndNameAndPath.name.M;
				image_url.img_url_s = '/etzr_services/img/' + compressedSizeAndNameAndPath.name.S;
				return image_url;
			} else {
				if (picFileWidth >= 600) {
					images(filePath).resize(600, picFileHeight * 600 / picFileWidth).save(compressedSizeAndNameAndPath.path.M, {
						operation: 50
					});
					images(filePath).resize(200, picFileHeight * 200 / picFileWidth).save(compressedSizeAndNameAndPath.path.S, {
						operation: 50
					});
					image_url.img_url_L = resource_url;
					image_url.preview_url = resource_url;
					image_url.img_url_m = '/etzr_services/img/' + compressedSizeAndNameAndPath.name.M;
					image_url.img_url_s = '/etzr_services/img/' + compressedSizeAndNameAndPath.name.S;
					return image_url;
				} else {
					if (picFileWidth >= 200) {
						images(filePath).resize(200, picFileHeight * 200 / picFileWidth).save(compressedSizeAndNameAndPath.path.S, {
							operation: 50
						});
						image_url.img_url_L = resource_url;
						image_url.preview_url = resource_url;
						image_url.img_url_m = resource_url;
						image_url.img_url_s = '/etzr_services/img/' + compressedSizeAndNameAndPath.name.S;
						return image_url;
					} else {
						image_url.img_url_L = resource_url;
						image_url.preview_url = resource_url;
						image_url.img_url_m = resource_url;
						image_url.img_url_s = resource_url;
						return image_url;
					}
				}
			}
		}
	}
}


module.exports = imagesFun;