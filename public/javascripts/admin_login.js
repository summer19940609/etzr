var localStorage = window.localStorage;
$("#LoginBtn").on("click", function() {
  var adminName = $("#username").val();
  var password = $("#password").val();
  $.ajax({
      url: etzrUrl + '/login',
      type: 'POST',
      dataType: 'json',
      data: {
        username: adminName,
        password: password
      }
    })
    .done(function(info) {
      if (!info.flag) {
        alert(info.message);
        return false;
      }
      var roleType = info.data.userData.roleType;
      localStorage.setItem("userData",JSON.stringify(info.data.userData));
      console.log(roleType);
      if (roleType != 2) {
        alert("你不是老师！");
        window.location.href = "/etzr_services/admin_login";
        return false;
      }
      window.location.href = "/etzr_services/";
    })
    .fail(function(info) {
      alert(info.message);
      window.location.href = "/etzr_services/admin_login"
    })
    .always(function() {
      console.log("complete");
    });

})