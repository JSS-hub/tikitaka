var express = require('express');
var router = express.Router();
var path = require('path');
var fs = require('fs');
var sanitizeHtml = require('sanitize-html');
var shortid = require('shortid');
var userDb = require('../lib/userdb');
var bcrypt = require('bcrypt');

var mongoose = require('mongoose');
mongoose.connect('mongodb://localhost:27017/testDB', { useNewUrlParser: true });
var db = mongoose.connection;

db.on('error', function () {
  console.log('Connection Failed!');
});
db.once('open', function () {
  console.log('Connected!');
});


module.exports = function (passport) {

  router.post('/login_process',
    passport.authenticate('local', {
      failureRedirect: '/auth/login',
      failureFlash: true,
    }), function (req, res) {
      console.log('login');
      req.session.logged = true;
      var Obj = new Object();
      Obj.flag = "success"
      Obj.user = req.user
      res.send(Obj)
    });
  router.get('/checkNickname',async function(req,res){
    let {nickname} = req.query
    try{
      let data = await userDb.find({"nickname":nickname}).countDocuments()
      if(data >= 1)
        return res.json({
          message : 0
        })
      else{
        return res.json({
          message :1
        })
      }
    }
    catch(e){
      console.log(e);
      return res.json({
        message: -1
      })
    }
  })
  router.get('/logout', function (request, response) {
    //    request.logout();
    //    delete request.session.logged
    request.session.destroy(function () {
      request.session;
    });

    return response.send()
    //    request.session.destory(); 
    // request.session.save(function () {
    //   response.redirect('/');
    // });
  });

  return router;
}


