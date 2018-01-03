var currentPage;
var currentCheckPage;

/*加载第一页*/
$(document).ready(function () {
  var page = 1;
  currentPage = 1;
  currentCheckPage = 1;
  var order = "DESC";
  var orderType = "p.new_create_time";
  var url = etzrUrl + '/diary/admin/list';
  var userData = localStorage.getItem("userData");
  if (!userData) {
    return false;
  }
  var name = JSON.parse(userData).name;
  $(".username").empty().text(name);
  var className = JSON.parse(userData).className;
  if (!className) {
    return false;
  }
  listPass(url, page, order, orderType, className);
  listChecking(url, page, order, orderType, className);
});

function listChecking(url, page, order, orderType, className) {
  var classNameArr = className.split(',');
  classNameArr.push(className);
  
  var obj = {
    page: page,
    order: order,
    orderType: orderType,
    user_id: user_id,
    pass_flag: 0,
    token: token,
    className: classNameArr
  }
  // ajax发送数组的方法，约定处理格式为json
  $.ajax({
      url: url,
      type: 'POST',
      dataType: 'json',
      data: JSON.stringify(obj),
      contentType: "application/json",
    })
    .done(function (info) {
      if (!info.flag) {
        $("#diaryNotPass").empty().append('<tr><td colspan="5">查询错误</td></tr>');
        return false;
      }
      if (!info.data) {
        $("#diaryNotPass").empty().append('<tr><td colspan="5">无数据</td></tr>');
        return false;
      }
      //输出页码
      var pageNum = info.pageNum;
      var pageNumStr = "";
      for (var i = 1; i <= pageNum; i++) {
        pageNumStr += '<li class="page_num_checking" page="' + i + '"><a href="#">' + i + '</a></li>';
      }
      $("#pageNumArea-checking").empty().append(pageNumStr);
      $("#pageNumArea-checking").find("li").eq(Number(currentCheckPage) - 1).addClass("active");
      var diaryStr = "";
      $.each(info.data, function (index, el) {
        var imgStr = "";
        if (!el.imgData.length) {
          imgStr = "无图片";
        } else {
          var imgData = el.imgData.split(',');
          console.log(imgData);
          for (var i = 0; i < imgData.length; i++) {
            imgStr += '<a style="margin-right: 10px;" href="' + imgData[i] + '" target="_blank"><img alt="无法显示" src="' + imgData[i] + '" style="width: 40px;"></a>';
          }
        }
        var str = '<tr id="' + el.id + '"><td>' + el.real_name + '</td><td>' + el.content + '</td><td>' + diaryWeather[el.otherfield] + '</td><td>' + imgStr + '</td><td><button class="btn btn-danger delete" rel="' + el.id + '">删除</button><button class="btn btn-primary pass" rel="' + el.id + '">通过审核</button></td></tr>'
        diaryStr += str;
      });
      $("#diaryNotPass").empty().append(diaryStr);
    })
    .fail(function (info) {
      console.log(info.message);
    })
    .always(function () {
      console.log("complete");
    });
}


function listPass(url, page, order, orderType, className) {
  // className的转换成数组形式，例如
  // '三年级,四年级'  ===>  ['三年级','四年级','三年级,四年级']
  var classNameArr = className.split(',');
  classNameArr.push(className);
  // classNameArr = ['四年级', '三年级', '四年级,三年级']
  var obj = {
    page: page,
    order: order,
    orderType: orderType,
    user_id: user_id,
    pass_flag: 1,
    token: token,
    className: classNameArr
  }
  // ajax发送数组的方法，约定处理格式为json
  $.ajax({
      url: url,
      type: 'POST',
      dataType: 'json',
      data: JSON.stringify(obj),
      contentType: "application/json",
    })
    .done(function (info) {
      if (!info.flag) {
        $("#diaryPass").empty().append('<tr><td colspan="6">查询错误</td></tr>');
        return false;
      }
      if (!info.data) {
        $("#diaryPass").empty().append('<tr><td colspan="6">列表为空</td></tr>');
        return false;
      }
      //输出页码
      var pageNum = info.pageNum;
      var pageNumStr = "";
      for (var i = 1; i <= pageNum; i++) {
        pageNumStr += '<li class="page_num" page="' + i + '"><a href="#">' + i + '</a></li>';
      }
      $("#pageNumArea").empty().append(pageNumStr);
      $("#pageNumArea").find("li").eq(Number(currentPage) - 1).addClass("active");
      var diaryStr = "";
      $.each(info.data, function (index, el) {
        var imgStr = "";
        if (!el.imgData) {
          imgStr = '无图片';
        } else {
          var imgData = el.imgData.split(',');
          for (var i = 0; i < imgData.length; i++) {
            imgStr += '<a style="margin-right: 10px;" href="' + imgData[i] + '" target="_blank"><img alt="无法显示" src="' + imgData[i] + '" style="width: 40px;"></a>';
          }
        }
        var th_message = el.likeStatus ? "点赞" : "取消点赞";
        var str = '<tr id="' + el.id + '"><td>' + el.real_name + '</td><td>' + el.content + '</td><td>' + diaryWeather[el.otherfield] + '</td><td class="thumbsUp_num">' + el.thumbsUp_num + '</td><td>' + imgStr + '</td><td><button class="btn btn-danger delete" rel="' + el.id + '">删除</button><button class="btn btn-primary like" rel="' + el.id + '">' + th_message + '</button></td></tr>'
        diaryStr += str;
      });
      $("#diaryPass").empty().append(diaryStr);
    })
    .fail(function (info) {
      console.log(info.message);
    })
    .always(function () {
      console.log("complete");
    });
}

/*点击页码*/
$("#pageNumArea").on('click', '.page_num', function (event) {
  $("#pageNumArea").find("li").eq(Number(currentPage) - 1).removeClass("active");
  var page = $(this).attr("page");
  page = Number(page);
  if (currentPage === page) {
    return false;
  }
  currentPage = page;
  var order = $(".order").val();
  var orderType = $(".orderType").val();
  var url = etzrUrl + '/diary/admin/list';
  var userData = localStorage.getItem("userData");
  if (!userData) {
    return false;
  }
  var className = JSON.parse(userData).className;
  listPass(url, page, order, orderType, className);
  $("#pageNumArea").find("li").eq(page - 1).addClass("active");
});


$("#pageNumArea-checking").on('click', '.page_num_checking', function (event) {
  $("#pageNumArea-checking").find("li").eq(Number(currentCheckPage) - 1).removeClass("active");
  var page = $(this).attr("page");
  page = Number(page);
  if (currentCheckPage === page) {
    return false;
  }
  currentCheckPage = page;
  var order = $(".order").val();
  var orderType = $(".orderType").val();
  var url = etzrUrl + '/diary/admin/list';
  var userData = localStorage.getItem("userData");
  if (!userData) {
    return false;
  }
  var className = JSON.parse(userData).className;
  listChecking(url, page, order, orderType, className);
});

/*点击删除*/
$("#diaryPass").on('click', '.delete', function (event) {
  var theResponse = window.confirm("单击“确定”继续。单击“取消”停止。");
  if (!theResponse) {
    return false;
  }
  var id = $(this).attr('rel');
  $.ajax({
      url: etzrUrl + '/diary/delete',
      type: 'POST',
      dataType: 'json',
      data: {
        id: id,
        user_id: user_id,
        token: token
      }
    })
    .done(function (info) {
      console.log(info.message);
      location.reload();
    })
    .fail(function (info) {
      console.log(info.message);
      alert(info.message);
    })
    .always(function () {
      console.log("complete");
    });
});

$("#diaryNotPass").on('click', '.delete', function (event) {
  var theResponse = window.confirm("单击“确定”继续。单击“取消”停止。");
  if (!theResponse) {
    return false;
  }
  var id = $(this).attr('rel');
  $.ajax({
      url: etzrUrl + '/diary/delete',
      type: 'POST',
      dataType: 'json',
      data: {
        id: id,
        user_id: user_id,
        token: token
      }
    })
    .done(function (info) {
      console.log(info.message);
      location.reload();
    })
    .fail(function (info) {
      console.log(info.message);
      alert(info.message);
    })
    .always(function () {
      console.log("complete");
    });
});


$("#diaryNotPass").on('click', '.pass', function (event) {
  var id = $(this).attr('rel');
  $.ajax({
      url: etzrUrl + '/diary/pass',
      type: 'POST',
      dataType: 'json',
      data: {
        id: id,
        user_id: user_id,
        token: token
      }
    })
    .done(function (info) {
      console.log(info.message);
      location.reload();
      alert(info.message);
    })
    .fail(function (info) {
      console.log(info.message);
      alert(info.message);
    })
    .always(function () {
      console.log("complete");
    });
});

/*点赞额取消点赞*/
$("#diaryPass").on('click', '.like', function (event) {
  var id = $(this).attr('rel');
  var $this = $(this);
  var thumbsUp_flag = $(this).text();
  var oldThNum = $this.parent().siblings(".thumbsUp_num").text();
  console.log(oldThNum);
  if (thumbsUp_flag === "点赞") {
    //点赞
    $.ajax({
        url: etzrUrl + '/diary/like',
        type: 'POST',
        dataType: 'json',
        data: {
          id: id,
          user_id: user_id,
          token: token
        }
      })
      .done(function (info) {
        var new_num = info.num;
        alert(info.message);
        $this.text("取消点赞");
        $this.parent().siblings(".thumbsUp_num").text(parseInt(oldThNum) + 1);
      })
      .fail(function (info) {
        console.log(info.message);
        alert(info.message);
      })
      .always(function () {
        console.log("complete");
      });
  } else {
    /*取消点赞*/
    $.ajax({
        url: etzrUrl + '/diary/cancellike',
        type: 'POST',
        dataType: 'json',
        data: {
          id: id,
          user_id: user_id,
          token: token
        }
      })
      .done(function (info) {
        var new_num = info.num;
        alert(info.message);
        $this.text("点赞");
        $this.parent().siblings(".thumbsUp_num").text(parseInt(oldThNum) - 1);
      })
      .fail(function (info) {
        console.log(info.message);
        alert(info.message);
      })
      .always(function () {
        console.log("complete");
      });
  }
});


// 退出登录
$("#exit").on("click", function () {
  $.ajax({
      url: etzrUrl + '/admin/logout',
      type: 'GET'
    })
    .done(function (info) {
      alert(info.message);
      window.location.reload();
    })
    .fail(function () {
      console.log("error");
    })
    .always(function () {
      console.log("complete");
    });

})


//选择排序规则
$(".chooseOrderType").on("change", function () {
  var orderType = $(".chooseOrderType").val();
  $(".orderType").val(orderType);
  currentPage = 1;
  currentCheckPage = 1;
  //当前的排序规则和顺序
  var order = $(".order").val();
  console.log(order);
  var orderType = $(".orderType").val();
  console.log(orderType);
  var page = 1;
  var url = etzrUrl + '/diary/admin/list';
  var userData = localStorage.getItem("userData");
  if (!userData) {
    return false;
  }
  var className = JSON.parse(userData).className;
  listPass(url, page, order, orderType,className);
})

//选择排序方式
$(".chooseOrder").on("change", function () {
  var order = $(".chooseOrder").val();
  $(".order").val(order);
  currentPage = 1;
  currentCheckPage = 1;
  //当前的排序规则和顺序
  var order = $(".order").val();
  console.log(order);
  var orderType = $(".orderType").val();
  console.log(orderType);
  var page = 1;
  var url = etzrUrl + '/diary/admin/list';
  var userData = localStorage.getItem("userData");
  if (!userData) {
    return false;
  }
  var className = JSON.parse(userData).className;
  listPass(url, page, order, orderType, className);
})


diaryWeather = {
  "sunny": "晴",
  "cloudy": "多云",
  "fog": "雾",
  "overcast": "暴风雨",
  "rain": "雨",
  "sleet": "雨夹雪",
  "thundershower": "雷暴",
  "snow": "雪",
  "wind": "风"
}