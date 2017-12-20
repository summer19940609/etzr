var currentPage;
var currentCommentPage;

$(document).ready(function() {
  var page = 1;
  currentPage = 1;
  var url = etzrUrl + '/postcom/list';
  $.ajax({
      url: url,
      type: 'POST',
      dataType: 'json',
      data: {
        page: page,
        order: "DESC",
        orderType: "update_time",
        user_id: user_id,
        token: token
      }
    })
    .done(function(info) {
      if (!info.data) {
        $("#postcomList").empty().append('<tr><td colspan="5">列表为空</td></tr>');
        return false;
      }
      var pageNum = info.pageNum;
      var pageNumStr = "";
      var postcomStr = "";
      for (var i = 1; i <= pageNum; i++) {
        pageNumStr += '<li class="page_num" page="' + i + '"><a href="#">' + i + '</a></li>';
      }
      $("#postcomPageNum").empty().append(pageNumStr);
      $("#postcomPageNum").find("li").eq(0).addClass("active");
      $.each(info.data, function(index, el) {
        var imgStr = "";
        if (!el.imgData.length) {
          imgStr = "无图片";
        } else {
          var imgData = JSON.parse(JSON.stringify(el.imgData));
          for (var i = 0; i < imgData.length; i++) {
            imgStr += '<a style="margin-right:10px;" href="' + imgData[i].resource_url + '" target="_blank"><img alt="无法显示" src="' + imgData[i].resource_url + '" style="width:40px;"></a>';
          }
        }
        postcomStr += '<tr id="' + el.id + '"><td>' + el.real_name + '</td><td>' + el.title + '</td><td class="content-overflow">' + el.content + '</td><td>' + imgStr + '</td><td><button class="btn btn-danger delete" rel="' + el.id + '">删除</button><button class="btn btn-primary more" rel="' + el.id + '">详情</button></td></tr>'
      });
      $("#postcomList").empty().append(postcomStr);
    })
    .fail(function(info) {
      console.log(info.message);
    })
    .always(function() {
      console.log("complete");
    });
});


function submit() {
  var title = $("#title").val();
  var content = $("#content").val();
  var url = etzrUrl + "/postcom/add"; // 接收上传文件的后台地址
  var form = new FormData(); // FormData 对象
  for (var i = 0; i < document.getElementById("file").files.length; i++) {
    var fileObj = document.getElementById("file").files[i];
    form.append("mf" + i, fileObj); // 文件对象
  }
  form.append("userid", user_id);
  form.append("token", token);
  form.append("content", content);
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
$("#postcomPageNum").on('click', '.page_num', function() {
  $("#postcomPageNum").find("li").eq(Number(currentPage) - 1).removeClass("active");
  var page = $(this).attr("page");
  page = Number(page);
  if (currentPage === page) {
    return false;
  }
  currentPage = page;
  var orderType = $(".orderType").val();
  var order = $(".order").val();
  var url = etzrUrl + '/postcom/list';
  $.ajax({
      url: url,
      type: 'POST',
      dataType: 'json',
      data: {
        page: page,
        order: order,
        orderType: orderType,
        user_id: user_id,
        token: token
      }
    })
    .done(function(info) {
      if (!info.data) {
        $("#postcomList").empty().append('<tr><td colspan="5">列表为空</td></tr>');
        return false;
      }
      var pageNum = info.pageNum;
      var pageNumStr = "";
      var postcomStr = "";
      for (var i = 1; i <= pageNum; i++) {
        pageNumStr += '<li class="page_num" page="' + i + '"><a href="#">' + i + '</a></li>';
      }
      $("#postcomPageNum").empty().append(pageNumStr);
      $("#postcomPageNum").find("li").eq(Number(currentPage) - 1).addClass("active");
      $.each(info.data, function(index, el) {
        var imgStr = "";
        if (!el.imgData.length) {
          imgStr = "无图片";
        } else {
          var imgData = JSON.parse(JSON.stringify(el.imgData));
          for (var i = 0; i < imgData.length; i++) {
            imgStr += '<a style="margin-right:10px;" href="' + imgData[i].resource_url + '" target="_blank"><img alt="无法显示" src="' + imgData[i].resource_url + '" style="width:40px;"></a>';
          }
        }
        postcomStr += '<tr id="' + el.id + '"><td>' + el.real_name + '</td><td>' + el.title + '</td><td class="content-overflow">' + el.content + '</td><td>' + imgStr + '</td><td><button class="btn btn-danger delete" rel="' + el.id + '">删除</button><button class="btn btn-primary more" rel="' + el.id + '">详情</button></td></tr>'
      });
      $("#postcomList").empty().append(postcomStr);
    })
    .fail(function(info) {
      console.log(info.message);
    })
    .always(function() {
      console.log("complete");
    });
});



/*点击详情页*/
$("#postcomList").on('click', '.more', function(event) {
  var id = $(this).attr("rel");
  $.ajax({
      url: etzrUrl + '/postcom/single',
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
      var imgStr = '';
      if (!imgData) {
        imgStr = "无图片";
      } else {
        imgStr = '<a href="' + imgData[0].resource_url + '" target="_blank"><img alt="无法显示" src="' + imgData[0].resource_url + '" style="width:40px;"></a>';
      }
      //佳作基本信息
      $(".postcomTitle").empty().append(data.title);
      $(".postcomContent").empty().append(data.content);
      $(".postcomCommentNum").empty().append(data.comment_num);
      $(".postcomImg").empty().append(imgStr);
      var commentDataStr = "";
      var commentData = data.commentData;
      if (!commentData) {
        commentDataStr = '<tr><td colspan="3">无评论信息</td></tr>'
      } else {
        for (var i = 0; i < commentData.length; i++) {
          var replyComment = commentData[i].replyData;
          var replyStr = "";
          if (!replyComment) {
            replyStr = "";
          } else {
            $.each(replyComment, function(index, el) {
              replyStr += '<tr><td>' + el.real_name + '</td><td style="max-width:300px;">' + el.content + '</td><td><button class="btn btn-danger commentDelete" rel="' + el.id + '">删除评论</button></td></tr>';
            });
          }
          commentDataStr += '<tr><td style="color:red;">' + commentData[i].real_name + '</td><td style="max-width:300px;">' + commentData[i].content + '</td><td><button class="btn btn-danger commentDelete" rel="' + commentData[i].id + '">删除评论</button></td></tr>' + replyStr;
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
      $("#commentPageNum").attr('pid', data.id);
    })
    .fail(function() {
      console.log("error");
    })
    .always(function() {
      console.log("complete");
    });

});



$("#postcomList").on('click', '.delete', function(event) {
  var theResponse = window.confirm("单击“确定”继续。单击“取消”停止。");
  if (!theResponse) {
    return false;
  }
  var postcom_id = $(this).attr("rel");
  //删除佳作，传递佳作id
  $.ajax({
      url: etzrUrl + '/postcom/delete',
      type: 'POST',
      dataType: 'json',
      data: {
        id: postcom_id,
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
  var postcom_id = $("#commentPageNum").attr("pid");
  $.ajax({
      url: etzrUrl + '/postcom/listComment',
      type: 'POST',
      dataType: 'json',
      data: {
        page: page,
        postcom_id: postcom_id,
        user_id: user_id,
        token: token
      }
    })
    .done(function(info) {
      var commentDataStr = "";
      var commentData = info.data;
      if (!commentData) {
        commentDataStr = '<tr><td colspan="3">无评论信息</td></tr>'
      } else {
        for (var i = 0; i < commentData.length; i++) {
          var replyComment = commentData[i].replyData;
          var replyStr = "";
          if (!replyComment) {
            replyStr = "";
          } else {
            $.each(replyComment, function(index, el) {
              replyStr += '<tr><td>' + el.real_name + '</td><td style="max-width:300px;">' + el.content + '</td><td><button class="btn btn-danger commentDelete" rel="' + el.id + '">删除评论</button></td></tr>';
            });
          }
          commentDataStr += '<tr><td style="color:red;">' + commentData[i].real_name + '</td><td style="max-width:300px;">' + commentData[i].content + '</td><td><button class="btn btn-danger commentDelete" rel="' + commentData[i].id + '">删除评论</button></td></tr>' + replyStr;
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
      $("#commentPageNum").find("li").eq(Number(currentCommentPage)-1).addClass("active");
      $("#commentPageNum").attr('pid', data.id);
    })
    .fail(function(info) {
      console.log("error");
    })
    .always(function(info) {
      console.log("complete");
    });

});


$(".commentBox").on('click', '.commentDelete', function(event) {
  var theResponse = window.confirm("单击“确定”继续。单击“取消”停止。");
  if (!theResponse) {
    return false;
  }
  var comment_id = $(this).attr("rel"); //该评论的id
  var postcom_id = $("#commentPageNum").attr("pid"); //佳作id
  $.ajax({
      url: etzrUrl + '/postcom/comment/delete',
      type: 'POST',
      dataType: 'json',
      data: {
        id: comment_id,
        postcom_id: postcom_id,
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
    .fail(function() {
      console.log("error");
    })
    .always(function() {
      console.log("complete");
    });

});


$(".chooseOrderType").on("click", function() {
  var orderType = $(".chooseOrderType").val();
  $(".orderType").val(orderType);

  //当前的排序规则和顺序
  var order = $(".order").val();
  console.log(order);
  var orderType = $(".orderType").val();
  console.log(orderType);
  var page = 1;
  currentPage =1;
  var url = etzrUrl + '/postcom/list';
  $.ajax({
      url: url,
      type: 'POST',
      dataType: 'json',
      data: {
        page: page,
        order: order,
        orderType: orderType,
        user_id: user_id,
        token: token
      }
    })
    .done(function(info) {
      if (!info.data) {
        $("#postcomList").empty().append('<tr><td colspan="5">列表为空</td></tr>');
        return false;
      }
      var pageNum = info.pageNum;
      var pageNumStr = "";
      var postcomStr = "";
      for (var i = 1; i <= pageNum; i++) {
        pageNumStr += '<li class="page_num" page="' + i + '"><a href="#">' + i + '</a></li>';
      }
      $("#postcomPageNum").empty().append(pageNumStr);
      $("#postcomPageNum").find("li").eq(0).addClass("active");
      $.each(info.data, function(index, el) {
        var imgStr = "";
        if (!el.imgData.length) {
          imgStr = "无图片";
        } else {
          var imgData = JSON.parse(JSON.stringify(el.imgData));
          for (var i = 0; i < imgData.length; i++) {
            imgStr += '<a style="margin-right:10px;" href="' + imgData[i].resource_url + '" target="_blank"><img alt="无法显示" src="' + imgData[i].resource_url + '" style="width:40px;"></a>';
          }
        }
        postcomStr += '<tr id="' + el.id + '"><td>' + el.real_name + '</td><td>' + el.title + '</td><td class="content-overflow">' + el.content + '</td><td>' + imgStr + '</td><td><button class="btn btn-danger delete" rel="' + el.id + '">删除</button><button class="btn btn-primary more" rel="' + el.id + '">详情</button></td></tr>'
      });
      $("#postcomList").empty().append(postcomStr);
    })
    .fail(function(info) {
      console.log(info.message);
    })
    .always(function() {
      console.log("complete");
    });
});

$(".chooseOrder").on("change", function() {
  var order = $(".chooseOrder").val();
  $(".order").val(order);
  currentPage =1;
  //当前的排序规则和顺序
  var order = $(".order").val();
  console.log(order);
  var orderType = $(".orderType").val();
  console.log(orderType);
  var page = 1;
  var url = etzrUrl + '/postcom/list';
  $.ajax({
      url: url,
      type: 'POST',
      dataType: 'json',
      data: {
        page: page,
        order: order,
        orderType: orderType,
        user_id: user_id,
        token: token
      }
    })
    .done(function(info) {
      if (!info.data) {
        $("#postcomList").empty().append('<tr><td colspan="5">列表为空</td></tr>');
        return false;
      }
      var pageNum = info.pageNum;
      var pageNumStr = "";
      var postcomStr = "";
      for (var i = 1; i <= pageNum; i++) {
        pageNumStr += '<li class="page_num" page="' + i + '"><a href="#">' + i + '</a></li>';
      }
      $("#postcomPageNum").empty().append(pageNumStr);
      $("#postcomPageNum").find("li").eq(0).addClass("active");
      $.each(info.data, function(index, el) {
        var imgStr = "";
        if (!el.imgData.length) {
          imgStr = "无图片";
        } else {
          var imgData = JSON.parse(JSON.stringify(el.imgData));
          for (var i = 0; i < imgData.length; i++) {
            imgStr += '<a style="margin-right:10px;" href="' + imgData[i].resource_url + '" target="_blank"><img alt="无法显示" src="' + imgData[i].resource_url + '" style="width:40px;"></a>';
          }
        }
        postcomStr += '<tr id="' + el.id + '"><td>' + el.real_name + '</td><td>' + el.title + '</td><td class="content-overflow">' + el.content + '</td><td>' + imgStr + '</td><td><button class="btn btn-danger delete" rel="' + el.id + '">删除</button><button class="btn btn-primary more" rel="' + el.id + '">详情</button></td></tr>'
      });
      $("#postcomList").empty().append(postcomStr);
    })
    .fail(function(info) {
      console.log(info.message);
    })
    .always(function() {
      console.log("complete");
    });
});