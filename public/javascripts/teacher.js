function submit() {
  var name = $("#name").val();
  var school = $("#school").val();
  var content = $("#content").val();
  var url = etzrUrl + "/teacher/add"; // 接收上传文件的后台地址
  var form = new FormData(); // FormData 对象
  for (var i = 0; i < document.getElementById("file").files.length; i++) {
    var fileObj = document.getElementById("file").files[i];
    form.append("mf" + i, fileObj); // 文件对象
  }
  form.append("name", name);
  form.append("token", token);
  form.append("userid", user_id);
  form.append("school", school);
  form.append("content", content);
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

var currentPage;


$(document).ready(function() {
  var userData = localStorage.getItem('userData');
  var name = JSON.parse(userData).name;
  $(".username").empty().text(name);
  var page = 1;
  currentPage = 1;
  var url = etzrUrl + '/teacher/list';
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
        $("#teacherList").empty().append('<tr><td colspan="6">查询错误</td></tr>');
        return false;
      }
      if (!info.data) {
        $("#teacherList").empty().append('<tr><td colspan="6">列表为空</td></tr>');
        return false;
      }
      var pageNum = info.pageNum;
      var pageNumStr = "";
      for (var i = 1; i <= pageNum; i++) {
        pageNumStr += '<li class="page_num" page="' + i + '"><a href="#">' + i + '</a></li>';
      }
      $("#teacherPageNum").empty().append(pageNumStr);
      $("#teacherPageNum").find("li").eq(0).addClass("active");
      var teacherStr = "";
      $.each(info.data, function(index, el) {
        var imgStr = "";
        if (!el.imgData.length) {
          imgStr = '';
        } else {
          var imgData = JSON.parse(JSON.stringify(el.imgData));
          for (var i = 0; i < imgData.length; i++) {
            imgStr += '<a style="margin-right:10px;" href="' + imgData[i].resource_url + '" target="_blank"><img alt="无法显示" src="' + imgData[i].resource_url + '" style="width:40px;"></a>';
          }
        }
        var th_message = el.likeStatus ? "点赞" : "取消点赞";
        teacherStr += '<tr id="' + el.id + '"><td>' + el.title + '</td><td>' + el.otherfield + '</td><td>' + el.content + '</td><td class="thumbsUp_num">' + el.thumbsUp_num + '</td><td>' + imgStr + '</td><td><button class="btn btn-danger delete" rel="' + el.id + '">删除</button><button class="btn btn-primary like" rel="' + el.id + '">' + th_message + '</button></td></tr>'
      });
      $("#teacherList").empty().append(teacherStr);
    })
    .fail(function(info) {
      console.log(info.message);
      alert(info.message);
    })
    .always(function() {
      console.log("complete");
    });
});


$("#teacherPageNum").on('click', '.page_num', function() {
  $("#teacherPageNum").find("li").eq(Number(currentPage) - 1).removeClass("active");
  var page = $(this).attr("page");
  page = Number(page);
  if (currentPage === page) {
    return false;
  }
  currentPage = page;
  var url = etzrUrl + '/teacher/list';
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
        $("#teacherList").empty().append('<tr><td colspan="6">查询错误</td></tr>');
        return false;
      }
      if (!info.data) {
        $("#teacherList").empty().append('<tr><td colspan="6">列表为空</td></tr>');
        return false;
      }
      //输出页码
      var pageNum = info.pageNum;
      var pageNumStr = "";
      for (var i = 1; i <= pageNum; i++) {
        pageNumStr += '<li class="page_num" page="' + i + '"><a href="#">' + i + '</a></li>';
      }
      $("#teacherPageNum").empty().append(pageNumStr);
      $("#teacherPageNum").find("li").eq(Number(currentPage) - 1).addClass("active");
      var teacherStr = "";
      $.each(info.data, function(index, el) {
        var imgStr = "";
        if (!el.imgData.length) {
          imgStr = '';
        } else {
          var imgData = JSON.parse(JSON.stringify(el.imgData));
          for (var i = 0; i < imgData.length; i++) {
            imgStr += '<a style="margin-right:10px;" href="' + imgData[i].resource_url + '" target="_blank"><img alt="无法显示" src="' + imgData[i].resource_url + '" style="width:40px;"></a>';
          }
        }
        var th_message = el.likeStatus ? "点赞" : "取消点赞";
        teacherStr += '<tr id="' + el.id + '"><td>' + el.title + '</td><td>' + el.otherfield + '</td><td>' + el.content + '</td><td class="thumbsUp_num">' + el.thumbsUp_num + '</td><td>' + imgStr + '</td><td><button class="btn btn-danger delete" rel="' + el.id + '">删除</button><button class="btn btn-primary like" rel="' + el.id + '">' + th_message + '</button></td></tr>'
      });
      $("#teacherList").empty().append(teacherStr);
    })
    .fail(function(info) {
      console.log(info.message);
      alert(info.message);
    })
    .always(function() {
      console.log("complete");
    });
});


$("#teacherList").on('click', '.like', function(event) {
  var id = $(this).attr('rel');
  var $this = $(this);
  var thumbsUp_flag = $(this).text();
  var oldThNum = $this.parent().siblings(".thumbsUp_num").text();
  if (thumbsUp_flag === "点赞") {
    //点赞
    $.ajax({
        url: etzrUrl + '/teacher/like',
        type: 'POST',
        dataType: 'json',
        data: {
          id: id,
          user_id: user_id,
          token: token
        }
      })
      .done(function(info) {
        var new_num = info.num;
        alert(info.message);
        $this.text("取消点赞");
        $this.parent().siblings(".thumbsUp_num").text(parseInt(oldThNum) + 1);
      })
      .fail(function(info) {
        console.log(info.message);
        alert(info.message);
      })
      .always(function() {
        console.log("complete");
      });
  } else {
    /*取消点赞*/
    $.ajax({
        url: etzrUrl + '/teacher/cancellike',
        type: 'POST',
        dataType: 'json',
        data: {
          id: id,
          user_id: user_id,
          token: token
        }
      })
      .done(function(info) {
        var new_num = info.num;
        alert(info.message);
        $this.text("点赞");
        $this.parent().siblings(".thumbsUp_num").text(parseInt(oldThNum) - 1);
      })
      .fail(function(info) {
        console.log(info.message);
        alert(info.message);
      })
      .always(function() {
        console.log("complete");
      });
  }
});


$("#teacherList").on('click', '.delete', function(event) {
  var theResponse = window.confirm("单击“确定”继续。单击“取消”停止。");
  if (!theResponse) {
    return false;
  }
  var id = $(this).attr('rel');
  $.ajax({
      url: etzrUrl + '/teacher/delete',
      type: 'POST',
      dataType: 'json',
      data: {
        id: id,
        user_id: user_id,
        token: token
      }
    })
    .done(function(info) {
      alert(info.message);
      location.reload();
      console.log(info.message);
    })
    .fail(function(info) {
      alert(info, message);
      console.log(info.message);
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
      location.reload();
    })
    .fail(function() {
      console.log("error");
    })
    .always(function() {
      console.log("complete");
    });

})