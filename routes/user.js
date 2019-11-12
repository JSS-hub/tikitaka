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


/**
 * 프리랜서 목록 불러옴
 * Method: GET
 * query : pageId(현재 페이지) , size(페이지에서 요구하는 사이즈)
 */
router.get('', async function (request, response, next) {
  console.log('프리랜서 목록조회');
  var pid;
  var Obj = new Object();
  Obj.flag = "fail"
  if (request.query.pageId){
    pid = request.query.pageId;
    var size;
    if (request.query.size)
      size = request.query.size;
    else
      size = 10;
    const {text,cat} = request.query
    
    var startUserId = ((Number(pid) - 1) * Number(size))
    let result 
    if(text !='null' && text!='undefined'){
      const query = new RegExp(text);
      try{
        result = await userDb.find({freeflag: 0}).sort().skip(startUserId).limit(Number(size)).where(cat).regex(query)
        const counts = await userDb.find({ freeflag: 0 }).where(cat).regex(query).countDocuments();
        Obj.lastPage = Math.ceil(counts/size);
        Obj.flag = "success"
        Obj.user = result
      }
      catch(e){
        console.log(e);
      }
    }
    else{
      try{
        result = await userDb.find({ freeflag: 0 }).sort().skip(startUserId).limit(Number(size));
        const counts = await userDb.find({ freeflag: 0 }).countDocuments();
        Obj.lastPage = Math.ceil(counts/size);
        Obj.flag = "success"
        Obj.user = result
      }
      catch(e){
        console.log(e);
        
      }
    }
    return response.send(Obj)
  }
});


// db.users.aggregate([
//   // Project with an array length
//   { "$project": {
//       "name": 1,
//       "proList": 1,
//       "length": { "$size": "$proList" }
//   }},

//   // Sort on the "length"
//   { "$sort": { "length": -1 } },

//   // Project if you really want
//   { "$project": {
//       "name": 1,
//       "proList": 1,
//   }}
// ])

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



router.put('/update_pass', function (request, response) {

  console.log('test')
  var post = request.body;
  console.log(post);
  
  var pre_pwd = post.pre_password;
  var pwd = post.password;
  var id = request.session.passport.user;
  console.log(pre_pwd)
  console.log(pwd)

  if (!auth.isOwner(request, response)) {
    response.redirect('/');
    return false;
  }
  //"password" : "$2b$10$IF7sZyX6ahmfuqCNtOJFVOhsz1aQPWk8/vSa5PK9E66iz3CIYKsX6",
  bcrypt.hash(pwd, 10, function (err, hash) {
    userDb.findOne({ id: id }, function (error, user) {
      if (user.userId !== request.user.userId) {
        request.flash('error', 'Not yours!');
        return response.redirect('/');
      }
      if (bcrypt.compare(pre_pwd, user.password, function (err, same) {
        if (same) {
          user.password = hash

          user.save(function (error, data) {
            if (error) {
              console.log(error);
              console.log('unSaved!')
            } else {
              console.log('Saved!')
              return response.json({
                message:"변경되었습니다."
              });
            }
          })
        }
        else{
          
          return response.json({
            message:"기존비밀번호가 알맞지 않습니다."
          });
        }
      }));

    })
  });
});


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
          console.log('==================');
          
          console.log(post);
          
          console.log(post.careerList);
          console.log('==================');
        
        if (request.query.freeflag) {
          //user.freeflag = request.query.freeflag
          if (user.freeflag == 0) {
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
            if (post.careerList)
              user.careerList = post.careerList
          }
        }

        //비밀번호 추가

        //팔로우 언팔로우 추가 (사람)
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
          // 프로젝트 팔로우
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







module.exports = router;