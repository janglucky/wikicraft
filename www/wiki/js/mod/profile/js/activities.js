/*
 * @Author: ZhangKaitlyn 
 * @Date: 2018-01-19
 * @Last Modified by: mikey.zhaopeng
 * @Last Modified time: 2018-01-19 14:57:29
 */
define([
    'app', 
    'helper/util',
    'text!wikimod/profile/html/activities.html'
], function (app, util, htmlContent) {
    function registerController(wikiBlock) {
        app.registerController("activitiesCtrl", ['$scope', '$translate',function ($scope, $translate) {
            var init = function(userinfo){
                var username = $scope.urlObj.username.toLowerCase();;
                if (!username && userinfo && userinfo.username) {
                    username = userinfo.username;
                }
                if (!username) {
                    console.error("用户名不存在");
                    return;
                }

                util.post(config.apiUrlPrefix + 'user/getDetailByName', {username:username}, function (data) {
                    if (!data) {
                        console.error("用户信息不存在");
                        return ;
                    }

                    $scope.trendsList = (data.trendsObj.trendsList || []).map(function(item) {
                      item.desc = (item.desc||'').replace('创建站点', ' ' + $translate.instant('创建站点') + ' ')
                      item.desc = (item.desc||'').replace('删除站点', ' ' + $translate.instant('删除站点') + ' ')
                      item.desc = (item.desc||'').replace('关注', ' ' + $translate.instant('关注') + ' ')
                      return item
                    });

                    $scope.trendsCount = data.trendsObj.total;
                });
            }

            $scope.loadActivity = function(){
                console.log("加载更多活动。。。");
            }

            $scope.$watch('$viewContentLoaded', function () {
                //console.log("------------------init user controller----------------------");
                if ($scope.urlObj.username) {
                    init();
                } else {
                    if (Account.isAuthenticated()) {
                        Account.getUser(init);
                    }
                }
            });
        }]);
    }

    return {
        render: function (wikiBlock) {
            registerController(wikiBlock);
            return  htmlContent;       // 返回模块标签内容
        }
    }
});