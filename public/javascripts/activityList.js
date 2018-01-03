$(document).ready(function() {
  var userData = localStorage.getItem('userData');
  var name = JSON.parse(userData).name;
  $(".username").empty().text(name);
  var page = 1;
  currentPage = 1;
  var url = etzrUrl + '/activity/list';
  $.ajax({
      url: url,
      type: 'POST',
      dataType: 'json',
      data: {
        page: page,
        order: "DESC",
        orderType: "create_time",
        user_id: user_id,
        token: token
      }
    })
    .done(function(info) {
      if (!info.flag) {
        $("#activityList").empty().append('<tr><td colspan="5">查询错误</td></tr>');
        return false;
      }
      if (!info.data) {
        $("#activityList").empty().append('<tr><td colspan="5">列表为空</td></tr>');
        return false;
      }
      var pageNum = info.pageNum;
      var pageNumStr = "";
      for (var i = 1; i <= pageNum; i++) {
        pageNumStr += '<li class="page_num" page="' + i + '"><a href="#">' + i + '</a></li>';
      }
      $("#activityPageNum").empty().append(pageNumStr);
      $("#activityPageNum").find("li").eq(0).addClass("active");
      var activityStr = "";
      $.each(info.data, function(index, el) {
        var imgStr = '';
        if (!el.imgData.length) {
          imgStr = '无图片';
        } else {
          var imgData = JSON.parse(JSON.stringify(el.imgData));
          for (var i = 0; i < imgData.length; i++) {
            imgStr += '<a style="margin-right:10px;" href="' + imgData[i].resource_url + '" target="_blank"><img alt="无法显示" src="' + imgData[i].resource_url + '" style="width:40px;"></a>';
          }
        }
        var str = '<tr id="' + el.id + '"><td>' + el.real_name + '</td><td>' + el.title + '</td><td>' + el.content + '</td><td>' + imgStr + '</td><td><button class="btn btn-danger delete" rel="' + el.id + '">删除</button></td></tr>'
        activityStr += str;
      });
      $("#activityList").empty().append(activityStr);
    })
    .fail(function(info) {
      console.log(info.message);
      alert(info.message);
    })
    .always(function() {
      console.log("complete");
    });

});

var currentPage;
/*点击发布*/
function submit() {
  var content = $("#content").val();
  var add_time = "2017-07-12";
  var title = $("#title").val();
  var url = etzrUrl + "/activity/add"; // 接收上传文件的后台地址
  var form = new FormData(); // FormData 对象
  for (var i = 0; i < document.getElementById("file").files.length; i++) {
    var fileObj = document.getElementById("file").files[i];
    form.append("mf" + i, fileObj); // 文件对象
  }
  form.append("userid", user_id);
  form.append("token", token);
  form.append("content", content);
  form.append("add_time", add_time);
  form.append("title", title);
  xhr = new XMLHttpRequest(); // XMLHttpRequest 对象
  xhr.open("post", url, true); //post方式，url为服务器请求地址，true 
  xhr.onload = uploadComplete; //请求完成
  xhr.onerror = uploadFailed; //请求失败
  xhr.send(form);

  //上传成功响应
  function uploadComplete(evt) {
    //服务断接收完文件返回的结果
    //    alert(evt.target.responseText);
    alert("上传成功！");
    location.reload();
  }
  //上传失败
  function uploadFailed(evt) {
    alert("上传失败！");
  }
};


/*点击页码*/
$("#activityPageNum").on("click", '.page_num', function() {
  $("#activityPageNum").find("li").eq(Number(currentPage) - 1).removeClass("active");
  var page = $(this).attr("page");
  page = Number(page);
  if (currentPage === page) {
    return false;
  }
  currentPage = page;
  var url = etzrUrl + '/activity/list';
  $.ajax({
      url: url,
      type: 'POST',
      dataType: 'json',
      data: {
        page: page,
        order: "DESC",
        orderType: "create_time",
        user_id: user_id,
        token: token
      }
    })
    .done(function(info) {
      if (!info.flag) {
        $("#activityList").empty().append('<tr><td colspan="5">查询错误</td></tr>');
        return false;
      }
      if (!info.data) {
        $("#activityList").empty().append('<tr><td colspan="5">列表为空</td></tr>');
        return false;
      }
      //输出页码
      var pageNum = info.pageNum;
      var pageNumStr = "";
      for (var i = 1; i <= pageNum; i++) {
        pageNumStr += '<li class="page_num" page="' + i + '"><a href="#">' + i + '</a></li>';
      }
      $("#activityPageNum").empty().append(pageNumStr);
      $("#activityPageNum").find("li").eq(Number(currentPage) - 1).addClass("active");
      var activityStr = "";
      $.each(info.data, function(index, el) {
        var imgStr = '';
        if (!el.imgData.length) {
          imgStr = '无图片';
        } else {
          var imgData = JSON.parse(JSON.stringify(el.imgData));
          for (var i = 0; i < imgData.length; i++) {
            imgStr += '<a style="margin-right:10px;" href="' + imgData[i].resource_url + '" target="_blank"><img alt="无法显示" src="' + imgData[i].resource_url + '" style="width:40px;"></a>';
          }
        }
        var str = '<tr id="' + el.id + '"><td>' + el.real_name + '</td><td>' + el.title + '</td><td>' + el.content + '</td><td>' + imgStr + '</td><td><button class="btn btn-danger delete" rel="' + el.id + '">删除</button></td></tr>'
        activityStr += str;
      });
      $("#activityList").empty().append(activityStr);
    })
    .fail(function(info) {
      console.log(info.message);
    })
    .always(function() {
      console.log("complete");
    });
});


$("#activityList").on('click', '.delete', function(event) {
  var theResponse = window.confirm("单击“确定”继续。单击“取消”停止。");
  if (!theResponse) {
    return false;
  }
  var id = $(this).attr('rel');
  $.ajax({
      url: etzrUrl + '/activity/delete',
      type: 'POST',
      dataType: 'json',
      data: {
        id: id,
        user_id: user_id,
        token: token
      }
    })
    .done(function(info) {
      console.log(info.message);
      location.reload();
      alert(info.message);
    })
    .fail(function(info) {
      console.log(info.message);
      alert(info.message);
    })
    .always(function() {
      console.log("complete");
    });
});


// 退出登录
$("#exit").on("click", function() {
  $.ajax({
      url: etzrUrl + '/admin/logout',
      type: 'GET'
    })
    .done(function(info) {
      alert(info.message);
      window.location.reload();
    })
    .fail(function() {
      console.log("error");
    })
    .always(function() {
      console.log("complete");
    });

})