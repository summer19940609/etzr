/*页面加载成功后第一页*/
var currentPage;
var currentCommentPage;

$(document).ready(function() {
  var userData = localStorage.getItem('userData');
  var name = JSON.parse(userData).name;
  $(".username").empty().text(name);
  var page = 1;
  currentPage = 1;
  // 获得当前日期
  var today = new Date();
  // 获得年份
  var year = today.getFullYear();
  var url = etzrUrl + '/finework/admin/list';
  $.ajax({
      url: url,
      type: 'POST',
      dataType: 'json',
      data: {
        page: page,
        year: year,
        user_id: user_id,
        token: token
      }
    })
    .done(function(info) {
      if (!info.flag) {
        $("#fineworkList").empty().append('<tr><td colspan="5">查询错误</td></tr>');
        return false;
      }
      if (!info.data) {
        $("#fineworkList").empty().append('<tr><td colspan="5">无数据</td></tr>');
        return false;
      }
      //输出页码
      var pageNum = info.pageNum;
      var pageNumStr = "";
      for (var i = 1; i <= pageNum; i++) {
        pageNumStr += '<li class="page_num" page="' + i + '"><a href="#">' + i + '</a></li>';
      }
      $("#fineworkPageNum").empty().append(pageNumStr);
      $("#fineworkPageNum").find("li").eq(0).addClass("active");
      var fineworkStr = "";
      $.each(info.data, function(index, el) {
        var imgStr = '';
        console.log(el.resource_url);
        if (!el.resource_url) {
          imgStr = '无图片';
        } else {
          imgStr = '<a style="margin-right:10px;" href="' + el.resource_url + '" target="_blank"><img alt="无法显示" src="' + el.resource_url + '" style="width:40px;"></a>';
        }
        var str = '<tr id="' + el.id + '"><td>' + name + '</td><td>' + el.title + '</td><td>' + el.content + '</td><td>' + imgStr + '</td><td><button class="btn btn-danger delete" rel="' + el.id + '">删除</button><button class="btn btn-primary more" rel="' + el.id + '">详情</button></td></tr>'
        fineworkStr += str;
      });
      $("#fineworkList").empty().append(fineworkStr);
    })
    .fail(function(info) {
      console.log(info.message);
      alert(info.message);
    })
    .always(function() {
      console.log("complete");
    });
});


/*点击发布*/
function submit() {
  var title = $("#title").val();
  var content = $("#content").val();
  var year = $("#year").val();
  var add_time = year + '-01-01';
  var url = etzrUrl + "/finework/add"; // 接收上传文件的后台地址
  var form = new FormData(); // FormData 对象
  for (var i = 0; i < document.getElementById("file").files.length; i++) {
    var fileObj = document.getElementById("file").files[i];
    form.append("mf" + i, fileObj); // 文件对象
  }
  form.append("userid", user_id);
  form.append("token", token);
  form.append("title", title);
  form.append("content", content);
  form.append("add_time", add_time);
  xhr = new XMLHttpRequest(); // XMLHttpRequest 对象
  xhr.open("post", url, true); //post方式，url为服务器请求地址，true 
  xhr.onload = uploadComplete; //请求完成
  xhr.onerror = uploadFailed; //请求失败
  xhr.send(form);

  //上传成功响应
  function uploadComplete(evt) {
    //服务断接收完文件返回的结果
    //    alert(evt.target.responseText);
    location.reload();
    alert("上传成功！");
  }
  //上传失败
  function uploadFailed(evt) {
    alert("上传失败！");
  }
};


/*点击页码*/
$("#fineworkPageNum").on("click", ".page_num", function() {
  var userData = localStorage.getItem('userData');
  var name = JSON.parse(userData).name;
  $("#fineworkPageNum").find("li").eq(Number(currentPage) - 1).removeClass("active");
  var page = $(this).attr("page");
  page = Number(page);
  if (currentPage === page) {
    return false;
  }
  currentPage = page;
  var year = $("#recordYear").val();
  var url = etzrUrl + '/finework/admin/list';
  $.ajax({
      url: url,
      type: 'POST',
      dataType: 'json',
      data: {
        page: page,
        year: year,
        user_id: user_id,
        token: token
      }
    })
    .done(function(info) {
      if (!info.flag) {
        $("#fineworkList").empty().append('<tr>查询错误</tr>');
        return false;
      }
      if (!info.data) {
        $("#fineworkList").empty().append('<tr>列表为空</tr>');
        return false;
      }
      //输出页码
      var pageNum = info.pageNum;
      var pageNumStr = "";
      for (var i = 1; i <= pageNum; i++) {
        pageNumStr += '<li class="page_num" page="' + i + '"><a href="#">' + i + '</a></li>';
      }
      $("#fineworkPageNum").empty().append(pageNumStr);
      $("#fineworkPageNum").find("li").eq(Number(currentPage) - 1).addClass("active");
      var fineworkStr = "";
      $.each(info.data, function(index, el) {
        var imgStr = '';
        if (!el.resource_url) {
          imgStr = '无图片';
        } else {
          imgStr = '<a style="margin-right:10px;" href="' + el.resource_url + '" target="_blank"><img alt="无法显示" src="' + el.resource_url + '" style="width:40px;"></a>';
        }
        var str = '<tr id="' + el.id + '"><td>' + name + '</td><td>' + el.title + '</td><td>' + el.content + '</td><td>' + imgStr + '</td><td><button class="btn btn-danger delete" rel="' + el.id + '">删除</button><button class="btn btn-primary more" rel="' + el.id + '">详情</button></td></tr>'
        fineworkStr += str;
      });
      $("#fineworkList").empty().append(fineworkStr);
    })
    .fail(function(info) {
      console.log(info.message);
    })
    .always(function() {
      console.log("complete");
    });
});



/*点击详情页*/
$("#fineworkList").on('click', '.more', function(event) {
  var id = $(this).attr("rel");
  console.log(id);
  $.ajax({
      url: etzrUrl + '/finework/single',
      type: 'POST',
      dataType: 'json',
      data: {
        id: id,
        user_id: user_id,
        token: token
      }
    })
    .done(function(info) {
      currentCommentPage = 1;
      var data = info.data;
      var imgData = data.imgData;
      if (!data.comment_num) {
        var trueScore = 0;
      } else {
        var trueScore = Number(data.score) / Number(data.comment_num);
        trueScore = trueScore.toFixed(1);
      }
      var imgStr = '';
      if (!imgData[0].resource_url) {
        imgStr = '无图片';
      } else {
        imgStr = '<a href="' + imgData[0].resource_url + '" target="_blank"><img alt="无法显示" src="' + imgData[0].resource_url + '" style="width:40px;"></a>';
      }
      //佳作基本信息
      $(".fineworkTitle").empty().append(data.title);
      $(".fineworkContent").empty().append(data.content);
      $(".fineworkScore").empty().append(trueScore);
      $(".fineworkCommentNum").empty().append(data.comment_num);
      $(".fineworkImg").empty().append(imgStr);
      var commentDataStr = "";
      var commentData = data.commentData;
      if (!commentData) {
        commentDataStr = '<tr><td colspan="4">无评论信息</td></tr>';
      } else {
        for (var i = 0; i < commentData.length; i++) {
          commentDataStr += '<tr><td>' + commentData[i].real_name + '</td><td style="max-width:300px;">' + commentData[i].content + '</td><td>' + commentData[i].score + '</td><td><button class="btn btn-danger commentDelete" rel="' + commentData[i].id + '">删除评论</button></td></tr>';
        }
      }
      $("#commentList").empty().append(commentDataStr);
      var comment_num = data.comment_num;
      var commentPageStr = "";
      var commentPageNum = Math.ceil(comment_num / 10);
      for (var i = 1; i <= commentPageNum; i++) {
        commentPageStr += '<li class="compage_num" page="' + i + '"><a href="#">' + i + '</a></li>';
      }
      $("#commentPageNum").empty().append(commentPageStr);
      $("#commentPageNum").find("li").eq(0).addClass("active");
      $("#commentPageNum").attr('fid', data.id);
    })
    .fail(function() {
      console.log("error");
    })
    .always(function() {
      console.log("complete");
    });

});


//点击删除
$("#fineworkList").on('click', '.delete', function(event) {
  var theResponse = window.confirm("单击“确定”继续。单击“取消”停止。");
  if (!theResponse) {
    return false;
  }
  var finework_id = $(this).attr("rel");
  //删除佳作，传递佳作id
  $.ajax({
      url: etzrUrl + '/finework/delete',
      type: 'POST',
      dataType: 'json',
      data: {
        id: finework_id,
        user_id: user_id,
        token: token
      }
    })
    .done(function(info) {
      console.log(info.message);
      alert(info.message);
      location.reload();
    })
    .fail(function(info) {
      console.log(info.message);
      alert(info.message);
    })
    .always(function() {
      console.log("complete");
    });

});


$("#commentPageNum").on('click', '.compage_num', function(event) {
  $("#commentPageNum").find("li").eq(Number(currentCommentPage) - 1).removeClass("active");
  var page = $(this).attr("page");
  page = Number(page);
  if (currentCommentPage === page) {
    return false;
  }
  currentCommentPage = page;
  var finework_id = $("#commentPageNum").attr("fid");
  $.ajax({
      url: etzrUrl + '/finework/listComment',
      type: 'POST',
      dataType: 'json',
      data: {
        page: page,
        finework_id: finework_id,
        user_id: user_id,
        token: token
      }
    })
    .done(function(info) {
      var data = info.data;
      var commentDataStr = "";
      $.each(data, function(index, el) {
        commentDataStr += '<tr><td>' + commentData[i].real_name + '</td><td style="max-width:300px;">' + commentData[i].content + '</td><td>' + commentData[i].score + '</td><td><button class="btn btn-danger commentDelete" rel="' + commentData[i].id + '">删除评论</button></td></tr>';
      });
      $("#commentList").empty().append(commentDataStr);
      $("#commentPageNum").find("li").eq(Number(currentCommentPage) - 1).addClass("active");
    })
    .fail(function(info) {
      console.log("error");
    })
    .always(function(info) {
      console.log("complete");
    });

});


$("#commentList").on('click', '.commentDelete', function(event) {
  var theResponse = window.confirm("单击“确定”继续。单击“取消”停止。");
  if (!theResponse) {
    return false;
  }
  var comment_id = $(this).attr("rel"); //该评论的id
  var oneScore = $(this).parent().prev().text(); //该评论的评分
  var finework_id = $("#commentPageNum").attr("fid");
  $.ajax({
      url: etzrUrl + '/finework/comment/delete',
      type: 'POST',
      dataType: 'json',
      data: {
        id: comment_id,
        oneScore: oneScore,
        finework_id: finework_id,
        user_id: user_id,
        token: token
      }
    })
    .done(function(info) {
      alert(info.message);
      location.reload();
    })
    .fail(function(info) {
      alert(info.message);
      location.reload();
    })
    .always(function() {
      console.log("complete");
    });

})



$("#choose-year").on("change", function() {
  var userData = localStorage.getItem('userData');
  var name = JSON.parse(userData).name;
  var choose_year = $("#choose-year").val();
  console.log(choose_year);
  var page = 1;
  currentPage = 1;
  $("#recordYear").val(choose_year);
  var url = etzrUrl + '/finework/admin/list';
  $.ajax({
      url: url,
      type: 'POST',
      dataType: 'json',
      data: {
        page: page,
        year: choose_year,
        user_id: user_id,
        token: token
      }
    })
    .done(function(info) {
      if (!info.flag) {
        $("#fineworkList").empty().append('<tr>查询错误</tr>');
        return false;
      }
      if (!info.data) {
        $("#fineworkList").empty().append('<tr>列表为空</tr>');
        return false;
      }
      //输出页码
      var pageNum = info.pageNum;
      var pageNumStr = "";
      for (var i = 1; i <= pageNum; i++) {
        pageNumStr += '<li class="page_num" page="' + i + '"><a href="#">' + i + '</a></li>';
      }
      $("#fineworkPageNum").empty().append(pageNumStr);
      $("#fineworkPageNum").find("li").eq(0).addClass("active");
      var fineworkStr = "";
      $.each(info.data, function(index, el) {
        var imgStr = '';
        if (!el.resource_url) {
          imgStr = '无图片';
        } else {
          imgStr = '<a style="margin-right:10px;" href="' + el.resource_url + '" target="_blank"><img alt="无法显示" src="' + el.resource_url + '" style="width:40px;"></a>';
        }
        var str = '<tr id="' + el.id + '"><td>' + name + '</td><td>' + el.title + '</td><td>' + el.content + '</td><td>' + imgStr + '</td><td><button class="btn btn-danger delete" rel="' + el.id + '">删除</button><button class="btn btn-primary more" rel="' + el.id + '">详情</button></td></tr>'
        fineworkStr += str;
      });
      $("#fineworkList").empty().append(fineworkStr);
    })
    .fail(function(info) {
      console.log(info.message);
      alert(info.message);
    })
    .always(function() {
      console.log("complete");
    });

})



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
    .fail(function(info) {
      alert(info.message);
      console.log("error");
    })
    .always(function() {
      console.log("complete");
    });

})