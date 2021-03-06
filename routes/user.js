
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
var nodemailer = require('nodemailer');
var key = require('../lib/.my_key')

router.get("/followUser/:oid", (req, res) => {
  const useroid = req.params.oid;
  // console.log(useroid);
  userDb.find({ _id: req.user.followUserList }, (err, users) => {
    if (err) return res.status(500).json({ error: "database failure" });

    res.json({ flag: "success", users });
  });
});
/**
 * 프리랜서 목록 불러옴
 * Method: GET
 * query : pageId(현재 페이지) , size(페이지에서 요구하는 사이즈)
 */
router.get('', async function (request, response, next) {
  console.log('프리랜서 목록조회');
  let pid;
  var Obj = new Object();
  Obj.flag = "fail"
  if (request.query.verification) {
    userDb.findOne({ _id: request.query.useroid }, function (error, user) {
      user.verification = request.query.verification;
      user.save().then(response.redirect('http://119.18.120.225:3000/'))
    })
  }

  if (request.query.pageId) {
    pid = request.query.pageId;
    var size;
    if (request.query.size)
      size = request.query.size;
    else
      size = 10;
    const { text, cat } = request.query

    var startUserId = ((Number(pid) - 1) * Number(size))
    let result
    if (text != 'null' && text != 'undefined') {
      const query = new RegExp(text);
      try {
        result = await userDb.find({ freeflag: 1 }).sort().skip(startUserId).limit(Number(size)).where(cat).regex(query)
        const counts = await userDb.find({ freeflag: 1 }).where(cat).regex(query).countDocuments();
        Obj.lastPage = Math.ceil(counts / size);
        Obj.flag = "success"
        Obj.user = result
      }
      catch (e) {
        console.log(e);
      }
    }
    else {
      try {
        result = await userDb.find({ freeflag: 1 }).sort().skip(startUserId).limit(Number(size));
        const counts = await userDb.find({ freeflag: 1 }).countDocuments();
        Obj.lastPage = Math.ceil(counts / size);
        Obj.flag = "success"
        Obj.user = result
      }
      catch (e) {
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

    var post = request.body;
    var user = new userDb({
      id: shortid.generate(),
      userId: post.userId,
      password: hash,
      name: post.name,
      nickname: post.nickname,
      location: post.location,
      organization: post.organization,
      freeflag: "0",
      verification: 0
    })
    userDb.findOne({ userId: post.userId }, function (err, data) {
      // console.log(data)
      if (data == null) {
        user.save(function (error, data) {
          if (error) {
            console.log(error);
            return response.send(Obj)
          } else {
            Obj.flag = "success"

            let transporter = nodemailer.createTransport({
              service: 'gmail',
              auth: {
                user: key.user,  // gmail 계정 아이디를 입력
                pass: key.pass   // gmail 계정의 비밀번호를 입력
              }
            });
            let mailOptions = {
              from: key.user,    // 발송 메일 주소 (위에서 작성한 gmail 계정 아이디)
              to: post.userId,                     // 수신 메일 주소
              subject: '[tikitaka] 본인 확인 메일입니다.',   // 제목
              html: '<p>아래의 링크를 클릭해주세요 !</p>' +
                "<a href=" + 'http://' + key.ip + ':4000/user?useroid=' + data._id + '&verification=1' + ">인증하기</a>"
            };

            transporter.sendMail(mailOptions, function (error, info) {
              if (error) {
                Obj.message = '이메일 형식이 잘못 되었습니다.'
                userDb.deleteOne({ userId: post.userId }, function (error,data) {
                  console.log(error);
                  return response.send(Obj);                
                })
                
                
              }
              else {
                // console.log('Email sent: ' + info.response);
                return response.send(Obj)
              }
            });
          }
        })
      }
      else {
        Obj.message = '이미 가입된 계정입니다.'
        return response.send(Obj);
      }
    })
  });
})

router.put('/update_pass', function (request, response) {

  var post = request.body;

  var pre_pwd = post.pre_password;
  var pwd = post.password;
  var id = request.session.passport.user;

  if (!auth.isOwner(request, response)) {
    response.redirect('/');
    return false;
  }
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
                message: "변경되었습니다."
              });
            }
          })
        }
        else {

          return response.json({
            message: "기존비밀번호가 알맞지 않습니다."
          });
        }
      }));

    })
  });
});
function randomString() {
  var chars = "0123456789ABCDEFGHIJKLMNOPQRSTUVWXTZabcdefghiklmnopqrstuvwxyz!@%^*~";
  var string_length = 9;
  var randomstring = '';
  for (var i = 0; i < string_length; i++) {
    var rnum = Math.floor(Math.random() * chars.length);
    randomstring += chars.substring(rnum, rnum + 1);
  }
  return randomstring;
}

router.put('/find_pass', function (request, response) {

  var post = request.body;
  var id = post.userId;
  // console.log(post);
  
  var pwd = randomString();
  bcrypt.hash(pwd, 10, function (err, hash) {
    userDb.findOne({ userId: id }, function (error, user) {
      // console.log(user);
      
      if (user) {
        user.password = hash;
        user.save(function (error, data) {
          if (error) {
            console.log(error);
            console.log('unSaved!')
            return response.json({
              flag: "fail",
              message: "비밀번호 변경에 실패했습니다."
            });
          } else {
            console.log('Saved!')

            let transporter = nodemailer.createTransport({
              service: 'gmail',
              auth: {
                user: key.user,  // gmail 계정 아이디를 입력
                pass: key.pass   // gmail 계정의 비밀번호를 입력
              }
            });
            let mailOptions = {
              from: key.user,    // 발송 메일 주소 (위에서 작성한 gmail 계정 아이디)
              to: post.userId,                     // 수신 메일 주소
              subject: '[tikitaka] 임시 비밀번호 발급 메일입니다.',   // 제목
              html: '<p> 비밀번호는 아래와 같습니다. 확인 후 변경 바랍니다.</p>' + pwd

            };

            transporter.sendMail(mailOptions, function (error, info) {
              if (error) {
                console.log(error);
                return response.json({
                  flag: "fail",
                  message: "비밀번호가 성공적으로 변경되었습니다. 메일 전송에 실패했습니다."
                });
              }
              else {
                return response.json({
                  flag: "success",
                  message: "비밀번호가 성공적으로 변경되었습니다. 메일 전송에 성공했습니다."
                });
              }
            });

          }
        })

      }
      else {
        // console.log('here');
        
        return response.json({
          flag: "fail",
          message: "존재하지 않는 이메일입니다."
        });
      }
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

        if (request.query.freeflag) {
          user.freeflag = request.query.freeflag
        }
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
                console.log('팔로우 추가!');

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
              // console.log(data);

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
    // console.log('--- Delete ---');
    if (error) {
      return response.send(Obj)
    }
    // console.log('--- deleted ---');
    Obj.flag = "success"
    return response.send(Obj)
  })
});

router.get('/:uid', function (request, response) {

  var Obj = new Object();
  Obj.flag = "fail"

  userDb.findOne({ _id: request.params.uid }, function (error, user) {
    if (error)
      return response.send(user)
    else {
      Obj.flag = "success"
      Obj.user = user
      // console.log(Obj);

      return response.send(Obj)
    }
  });
});







module.exports = router;