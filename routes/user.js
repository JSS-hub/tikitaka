var express = require('express');
var router = express.Router();
var path = require('path');
var fs = require('fs');
var sanitizeHtml = require('sanitize-html');
var auth = require('../lib/auth');
var userDb = require('../lib/userdb');
var projectDb = require('../lib/projectdb');
var shortid = require('shortid');
var bcrypt = require('bcrypt');



router.get('', function (request, response, next) {

  var pid;
  var Obj = new Object();
  Obj.flag = "fail"

  if (request.query.pageId)
    pid = request.query.pageId;
  else {
    userDb.find({ freeflag: 0 }).countDocuments(
      function (error, count) {
        Obj.flag = "success"
        Obj.count = count
        return response.send(Obj)
      }
    )
  }

  if (request.query.pageId) {
    var size;
    if (request.query.size)
      size = request.query.size;
    else
      size = 10;

    var startUserId = ((Number(pid) - 1) * Number(size))

    console.log('호출 됨?')

    userDb.find({ freeflag: 0 }, function (error, user) {
      if (error)
        return response.send(user)
      else {
        Obj.flag = "success"
        Obj.user = user
        return response.send(Obj)
      }
    }).sort().skip(startUserId).limit(Number(size));
  }
});


router.post('', function (request, response) {
  var post = request.body;
  var pwd = post.password;
  var Obj = new Object();
  Obj.flag = "fail"

  bcrypt.hash(pwd, 10, function (err, hash) {

    //var post = request.body;
    //console.log(post)

    var user = new userDb({
      id: shortid.generate(),
      userId: post.userId,
      password: hash,
      name: post.name,
      nickname: post.nickname,
      location: post.location,
      organization: post.organization,
      freeflag: "0"
    })

    user.save(function (error, data) {
      if (error) {
        console.log(error);
        return response.send(Obj)
      } else {
        Obj.flag = "success"
        console.log(Obj);
        
        return response.send(Obj)
      }
    })
  });
})



router.put('/:uid', function (request, response) {

  var Obj = new Object();
  Obj.flag = "fail"

  if (!auth.isOwner(request, response)) {
    return response.send(Obj)
  }

  var post = request.body;

  if (request.user._id != request.params.uid)
    return response.send(Obj)

  userDb.findOne({ _id: request.user._id }, function (error, user) {
    if (error)
      return response.send(Obj)
    else {
      if (user) {
        if (post.userId)
          user.userId = post.userId
        if (post.name)
          user.name = post.name
        if (post.nickname)
          user.nickname = post.nickname
        if (post.location)
          user.location = post.location
        if (post.organization)
          user.organization = post.organization

        if (request.query.freeflag) {
          user.freeflag = request.query.freeflag
          if (user.freeflag == 1) {
            if (post.intro)
              user.intro = post.intro
            if (post.grade)
              user.grade = post.grade
            if (post.educationList)
              user.educationList = post.educationList
            if (post.lisenceList)
              user.lisenceList = post.lisenceList
            if (post.categoryList)
              user.categoryList = post.categoryList
          }
        }

        //비밀번호 추가

        //팔로우 언팔로우 추가
        if (request.query.follow) {
          var follow = request.query.follow
          if (request.query.useroid) {
            userDb.findOne({ _id: request.query.useroid }, function (error, data) {
              if (error) {
                return response.send(Obj)
              }
              else {
                if (follow == 1) // 팔로우
                {
                  user.followUserList.push(data._id)
                  data.followerList.push(user._id)
                }
                else {
                  user.followUserList.pop(data._id)
                  data.followerList.pop(user._id)
                }
                user.save()
                data.save()
                Obj.flag = "success"
                return response.send(Obj)
              }
            })
          }
          else if (request.query.projectoid) {
            projectDb.findOne({ _id: request.query.projectoid }, function (error, data) {
              if (error) {
                return response.send(Obj)
              }
              else {
                if (follow == 1) // 팔로우
                {
                  user.followProList.push(data._id)
                  data.followerList.push(user._id)
                }
                else {
                  user.followProList.pop(data._id)
                  data.followerList.pop(user._id)
                }
                user.save()
                data.save()
                Obj.flag = "success"
                return response.send(Obj)
              }
            })
          }
        }
        else {
          user.save(function (error, data) {
            if (error) {
              return response.send(Obj)
            } else {
              Obj.flag = "success"
              return response.send(Obj)
            }
          })
        }
      }
    }
  })
});


router.delete('/:uid', function (request, response) {

  var Obj = new Object();
  Obj.flag = "fail"

  if (!auth.isOwner(request, response)) {
    return response.send(Obj)
  }

  if (request.user._id != request.params.uid)
    return response.send(Obj)


  userDb.deleteOne({ _id: request.params.uid }, function (error, output) {
    console.log('--- Delete ---');
    if (error) {
      return response.send(Obj)
    }
    console.log('--- deleted ---');
    Obj.flag = "success"
    return response.send(Obj)
  })
});

router.get('/:uid', function (request, response) {

  var Obj = new Object();
  Obj.flag = "fail"
  var freeflag = "0";
  if (request.query.freeflag)
    freeflag = request.query.freeflag;
  userDb.findOne({ _id: request.params.uid, freeflag: freeflag }, function (error, user) {
    if (error)
      return response.send(user)
    else {
      Obj.flag = "success"
      Obj.user = user
      return response.send(Obj)
    }
  });
});



router.put('/update_pass', function (request, response) {

  console.log('test')
  var post = request.body;
  var pre_pwd = post.pre_password;
  var pwd = post.password;
  var id = request.session.passport.user;

  console.log(pre_pwd)
  console.log(pwd)

  if (!auth.isOwner(request, response)) {
    response.redirect('/');
    return false;
  }
  if (user.userId !== request.user.userId) {
    request.flash('error', 'Not yours!');
    return response.redirect('/');
  }


  bcrypt.hash(pwd, 10, function (err, hash) {
    userDb.findOne({ id: id }, function (error, user) {
      if (bcrypt.compare(pre_pwd, user.password, function (err, same) {
        if (same) {
          user.password = hash

          user.save(function (error, data) {
            if (error) {
              console.log(error);
              console.log('unSaved!')
            } else {
              console.log('Saved!')
            }
          })
        }
      }));

    })

    return response.redirect('/')
  });
});





module.exports = router;