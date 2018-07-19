/**
 * Created by wuxiangan on 2016/12/21.
 */

define([
    'app',
    'helper/util',
    'helper/storage',
    'helper/dataSource',
    'helper/sensitiveWord',
    'text!html/join.html',
], function (app, util, storage, dataSource, sensitiveWord, htmlContent) {
    app.registerController('joinController', ['$scope', '$auth', '$interval', '$translate', 'Account', 'modal', 'Message', function ($scope, $auth, $interval, $translate, Account, modal, Message) {
        var getUrlParam=function (param) {
            var reg = new RegExp("(^|&)" + param + "=([^&]*)(&|$)"); //构造一个含有目标参数的正则表达式对象
            var r = window.location.search.substr(1).match(reg);  //匹配目标参数
            if (r != null) return r[2]; //返回参数值
        }
        //$scope.errMsg = "用户名或密码错误";
        $scope.userThreeService = undefined;
        $scope.isModal = false;
        $scope.step = 1;
        $scope.agree = true;
        $scope.locationOrigin = location.origin;
        $scope.isGlobalVersion = config.isGlobalVersion;

        $scope.registerInfo = {};
        $scope.smsId = '';
        $scope.registerCellPhoneSMSCodeWait = 0;
        $scope.registerCellPhoneSMSCodeIsSending = false;
        $scope.registerCellPhoneSMSCodeTimePromise && $interval.cancel($scope.registerCellPhoneSMSCodeTimePromise);

        //安全验证
        $scope.sendSMSCode = function () {
            var cellphone = ($scope.cellphone || '').replace(/\s/g, '');
            $scope.cellphone = cellphone;
            $scope.cellphoneErrMsg = "";
            $scope.smsCodeErrMsg = "";

            if (!/^[0-9]{11}$/.test($scope.cellphone)) {
                $scope.cellphoneErrMsg = $translate.instant("请先填写正确的手机号码");
                return;
            }
            if ($scope.registerCellPhoneSMSCodeWait > 0) {
                return;
            }
            $scope.registerCellPhoneSMSCodeIsSending = true;
            util.post(config.apiUrlPrefix + 'user/verifyCellphoneOne', {
                cellphone: $scope.cellphone
            }, function (data) {
                $scope.registerCellPhoneSMSCodeIsSending = false;
                $scope.smsId = data.smsId;

                $scope.registerCellPhoneSMSCodeWait = 60;
                $scope.registerCellPhoneSMSCodeTimePromise = $interval(function () {
                    if ($scope.registerCellPhoneSMSCodeWait <= 0) {
                        $interval.cancel($scope.registerCellPhoneSMSCodeTimePromise);
                        $scope.registerCellPhoneSMSCodeTimePromise = null;
                    } else {
                        $scope.registerCellPhoneSMSCodeWait--;
                    }
                }, 1000, 100);
                $scope.smsCode = "";
                $scope.cellphoneErrMsg = "";
            }, function (err) {
                $scope.registerCellPhoneSMSCodeIsSending = false;
                $scope.smsCodeErrMsg = err.message;
                $scope.cellphoneErrMsg = "";
            });
        };

        function init() {
          handleThirdUserJoin()
        }

        function handleThirdUserJoin() {
          var locationSeachArr = location.search.split(/\?|\=/);
          var userThreeServiceOnceTokenIndex = locationSeachArr.indexOf("userThreeServiceOnceToken");
          if (userThreeServiceOnceTokenIndex < 0) return
          var userThreeServiceOnceToken = locationSeachArr[userThreeServiceOnceTokenIndex + 1];
          if (!userThreeServiceOnceToken) return
          $scope.userThreeService = storage.onceStorageGetItem("userThreeServiceOnceToken" + userThreeServiceOnceToken)
          if (!$scope.userThreeService) return
          $scope.step = 3
        }

        $scope.$watch('$viewContentLoaded', init);

        $scope.goBack = function () {
            history.back(-1);
        };

        // 检查账号名（不可为纯数字，不可包含@符号,最长30个字符，可为小写字母、数字、下划线）
        $scope.checkInput = function (checks, type) {
            $scope.errMsg = "";
            $scope.nameErrMsg = "";
            $scope.pwdErrMsg = "";
            var username = $scope.username ? $scope.username : "";
            var pwd = $scope.password ? $scope.password : "";
            if (type == "other") {
                username = $scope.otherUsername ? $scope.otherUsername : "";
                pwd = $scope.otherPassword ? $scope.otherPassword : "";
            }
            if (checks.username) {
                sensitiveWord.getAllSensitiveWords(username).then(function (results) {
                    var isSensitive = results && results.length;
                    // isSensitive && console.log("包含敏感词:" + results.join("|"));
                    doCheckUsername(isSensitive, username);
                });
            }
            if (checks.password) {
                if (pwd.length < 6) {
                    $scope.pwdErrMsg = $translate.instant("*密码最少6位");
                    return;
                }
            }

            function doCheckUsername(isSensitive, username) {
                if (isSensitive) {
                    $scope.nameErrMsg = $translate.instant("您输入的内容不符合互联网安全规范，请修改");
                    return;
                }
                if (username.length > 30) {
                    $scope.nameErrMsg = $translate.instant("*账户名需小于30位");
                    return;
                }
                if (/^\d+$/.test(username)) {
                    $scope.nameErrMsg = $translate.instant("*账户名不可为纯数字");
                    return;
                }
                if (/@/.test(username)) {
                    $scope.nameErrMsg = $translate.instant("*账户名不可包含@符号");
                    return;
                }
                if (!/^[a-z_0-9]+$/.test(username)) {
                    $scope.nameErrMsg = $translate.instant("*账户名只能包含小写字母、数字");
                    return;
                }
            }
        };

        // 新注册用户及老用户（个人信息md文件不存在处理）
        var createProfilePages = function (userinfo, cb, errcb) {
            var userDataSource = dataSource.getUserDataSource(userinfo.username);
            userDataSource.registerInitFinishCallback(function () {
                var dataSourceInst = userDataSource.getDataSourceBySitename(userinfo.username);
                var pagePrefix = '/' + dataSourceInst.keepwrokUsername + '_datas/';
                var profilePagesList = [
                    {
                        pagepath: pagePrefix + "profile.md",
                        contentUrl: "text!html/profiles/profile.md"
                    },
                    {
                        pagepath: pagePrefix + "site.md",
                        contentUrl: "text!html/profiles/site.md"
                    },
                    {
                        pagepath: pagePrefix + "contact.md",
                        contentUrl: "text!html/profiles/contact.md"
                    }
                ];
                var fnList = [];
                profilePagesList.forEach(function (page) {
                    fnList.push(function (dataSourceInst, page) {
                        return function (cb, errcb) {
                            require([page.contentUrl], function (content) {
                                dataSourceInst.writeFile({
                                    path: page.pagepath,
                                    content: content
                                }, function () {
                                    cb && cb();
                                }, function () {
                                });
                            }, function () {
                                errcb && errcb();
                            })
                        }
                    }(dataSourceInst, page));
                });
                util.sequenceRun(fnList, undefined, function () {
                    cb && cb();
                }, function () {
                    cb && cb();
                });
            });

        }

        // 注册
        $scope.register = function (type) {
            function validateEmail(email) {
              var re = /^(([^<>()[\]\\.,;:\s@\"]+(\.[^<>()[\]\\.,;:\s@\"]+)*)|(\".+\"))@((\[[0-9]{1,3}\.[0-9]{1,3}\.[0-9]{1,3}\.[0-9]{1,3}\])|(([a-zA-Z\-0-9]+\.)+[a-zA-Z]{2,}))$/;
              return re.test(email);
            }

            // debugger;
            if (!$scope.agree) {
                return;
            }
            $scope.errMsg = "";
            $scope.nameErrMsg = "";
            $scope.pwdErrMsg = "";
            $scope.cellphoneErrMsg = "";
            $scope.smsCodeErrMsg = "";
            $scope.emailErrMsg = "";

            var params = {};

            // this is special for users from third auth service providers
            if (type == "other") {
              params = {
                  username: $scope.otherUsername ? $scope.otherUsername.trim() : "",
                  password: $scope.otherPassword ? $scope.otherPassword.trim() : "",
                  threeService: $scope.userThreeService,
              }
            } else {
              if (config.isGlobalVersion) {
                params = {
                  username: $scope.username ? $scope.username.trim() : "",
                  password: $scope.password ? $scope.password.trim() : "",
                  email: $scope.email ? $scope.email.trim() : ""
                }

                if (!validateEmail(params.email)) {
                  $scope.emailErrMsg = $translate.instant("*请输入正确的邮箱");
                  return;
                }

              } else {
                params = {
                    username: $scope.username ? $scope.username.trim() : "",
                    password: $scope.password ? $scope.password.trim() : "",
                    smsCode: $scope.smsCode,
                    smsId: $scope.smsId,
                    cellphone: $scope.cellphone
                };

                if (!params.cellphone) {
                    $scope.cellphoneErrMsg = $translate.instant("*手机号不能为空");
                    return;
                }

                if (!params.smsId) {
                    $scope.smsCodeErrMsg = $translate.instant("*请先发送验证码验证");
                    return;
                }

                if (!params.smsCode) {
                    $scope.smsCodeErrMsg = $translate.instant("*验证码不能为空");
                    return;
                }
              }
            }

            if (!params.username) {
                $scope.nameErrMsg = $translate.instant("*账户名不能为空");
                return;
            }

            var isSensitive = false;
            sensitiveWord.checkSensitiveWord(params.username, function (foundWords, replacedStr) {
                if (foundWords.length > 0) {
                    isSensitive = true;
                    // console.log("包含敏感词:" + foundWords.join("|"));
                }
            });
            if (isSensitive) {
                $scope.nameErrMsg = $translate.instant("您输入的内容不符合互联网安全规范，请修改");
                return;
            }
            if (params.username.length > 30) {
                $scope.nameErrMsg = $translate.instant("*账户名需小于30位");
                return;
            }
            if (/^\d+$/.test(params.username)) {
                $scope.nameErrMsg = $translate.instant("*账户名不可为纯数字");
                return;
            }
            if (/@/.test(params.username)) {
                $scope.nameErrMsg = $translate.instant("*账户名不可包含@符号");
                return;
            }
            if (!/^[a-z_0-9]+$/.test(params.username)) {
                $scope.nameErrMsg = $translate.instant("*账户名只能包含小写字母、数字");
                return;
            }
            if (params.password.length < 6) {
                $scope.pwdErrMsg = $translate.instant("*密码最少6位");
                return;
            }
            var imgUrl = $scope.getImageUrl("default_portrait.png", $scope.imgsPath);
            params.portrait = imgUrl;

            var url = type == "other" ? "user/bindThreeService" : "user/register";
            util.http("POST", config.apiUrlPrefix + url, params, function (data) {
                // console.log("注册成功");
                $auth.setToken(data.token);
                Account.setUser(data.userinfo);
                var _go = function () {
                    if (type == "other") {
                        util.go('/' + params.username);
                    } else {
                        $scope.step++;
                    }
                };
                // _go();
                if (data.isNewUser) {
                    // createTutorialSite(data.userinfo, _go, _go);
                    createProfilePages(data.userinfo, _go, _go);
                    util.post(config.apiUrlPrefix + "pages/insert", {
                        "url": '/' + params.username,
                    }, function (data) {
                    }, function (err) {
                        console.log(err)
                    })
                } else {
                  _go();
                }
            }, function (error) {
                $scope.errMsg = error.message;
                // console.log($scope.errMsg );
            });
        };

        // 创建新手引导站点及相关页面
        function createTutorialSite(userinfo, cb, errcb) {
            var _createTutorialSite = function () {
                util.post(config.apiUrlPrefix + 'website/create', {
                    "userId": userinfo._id,
                    "username": userinfo.username,
                    "name": "tutorial",
                    "displayName": "新手教程",
                    "categoryName": "个人站点",
                    "templateName": "教学模板",
                    "styleName": "默认样式",
                }, function (siteinfo) {
                    //var dataSourceInst = dataSource.getDataSourceInstance(siteinfo.dataSource.type);
                    var userDataSource = dataSource.getUserDataSource(siteinfo.username);
                    userDataSource.registerInitFinishCallback(function () {
                        var dataSourceInst = userDataSource.getDataSourceBySitename(siteinfo.name);
                        var pagepathPrefix = "/" + siteinfo.username + "/" + siteinfo.name + "/";
                        var tutorialPageList = [
                            {
                                "pagepath": pagepathPrefix + "index" + config.pageSuffixName,
                                "contentUrl": "text!html/tutorial/index.md",
                            }
                        ];
                        var fnList = [];

                        for (var i = 0; i < tutorialPageList.length; i++) {
                            fnList.push((function (index) {
                                return function (cb, errcb) {
                                    require([tutorialPageList[index].contentUrl], function (content) {
                                        dataSourceInst.writeFile({
                                            path: tutorialPageList[index].pagepath,
                                            content: content
                                        }, cb, errcb);
                                    }, function () {
                                        errcb && errcb();
                                    });
                                }
                            })(i));
                        }

                        util.sequenceRun(fnList, undefined, cb, cb);
                    });
                }, errcb);
            }
            var getDefaultDataSourceFailedCount = 0;
            var _getDefaultDataSource = function () {
                util.post(config.apiUrlPrefix + 'user/getDefaultSiteDataSource', { username: userinfo.username }, function (data) {
                    if (data) {
                        userinfo.dataSource = [data];
                        _createTutorialSite();
                        return;
                    } else {
                        getDefaultDataSourceFailedCount++;
                        if (getDefaultDataSourceFailedCount > 3) {
                            errcb && errcb();
                            return;
                        } else {
                            _getDefaultDataSource();
                        }
                    }
                }, errcb);
            }
            if (!userinfo.dataSource || userinfo.dataSource.length == 0) {
                _getDefaultDataSource();
            } else {
                _createTutorialSite();
            }
        }

        $scope.goUserCenter = function () {
            util.go('userCenter', true);
        }

        $scope.goUserHome = function () {
            util.goUserSite('/' + $scope.username);
        }

        $scope.goLicense = function () {
            util.go('license', true);
        }

        $scope.qqLogin = function () {
            // console.log("QQ登录");
            Authenticate("qq");
        }

        $scope.wechatLogin = function () {
            // console.log("微信登录");
            Authenticate("weixin");
        }

        $scope.sinaWeiboLogin = function () {
            // console.log("新浪微博登录");
            Authenticate("xinlangweibo");
        }

        $scope.githubLogin = function () {
            // console.log("github登录");
            Authenticate("github");
        }

        $scope.facebookLogin = function () {
          Authenticate("facebook");
        }

        $scope.googleLogin = function () {
          Authenticate("google");
        }

        function Authenticate(serviceName) {
            Account.authenticate(serviceName, function (data) {
                if ($auth.isAuthenticated()) {
                    Account.setUser(data.data);
                    if ($scope.isModal) {
                        $scope.$close(data.data);
                    } else {
                        var redirectUrl = getUrlParam("redirect");

                        if(redirectUrl) {
                            window.location.href = redirectUrl;
                        }
                        else {
                            util.go('/' + data.data.username);
                        }
                    }
                } else {
                    // 用户不存在 注册用户并携带data.data信息
                    $scope.userThreeService = data.data;
                    $scope.step = 3;
                }
            }, function (data) {

            });
        }

        //回车注册
        $(document).keyup(function (event) {
            if (event.keyCode == "13") {
                $scope.register();
            }
        });
    }]);
    return htmlContent;
});
