var express = require('express');
var router = express.Router();
var path = require('path');
var fs = require('fs');
var sanitizeHtml = require('sanitize-html');
var auth = require('../lib/auth');
var projectDb = require('../lib/projectdb');
var timelineDb = require('../lib/timelinedb');
var userDb = require('../lib/userdb');
var countDb = require('../lib/countdb')
var shortid = require('shortid');
var mongoose =require('mongoose')

router.get('',  async function (request, response, next) {
  var pid;
  var Obj = new Object();
  Obj.flag = "fail"
  // console.log('getProjectList');
  // console.log(request.query);
  
  if(request.query.pageId)
    pid=request.query.pageId;
  else
  {
    projectDb.find().countDocuments(
      function (error, count) {
        Obj.flag="success"
        Obj.count = count
        return response.send(Obj)
      }
    )
  }
  /**
   * order
   * undefined , 0 : 전체보기 '-projectId'
   * 1 : 마감순  'dueDate'
   * 2 : 높은가격 '-price'
   * 3 : 낮은가격 'price'
   */
  var size;
  
  if(request.query.size)
    size = request.query.size;
  else
    size = 10; 
  let sortText; 
  switch(request.query.order){
    case 'undefined':
    case '0':
        sortText = '-projectId'
        break;
    case '1':
        sortText = 'dueDate'
        break;
    case '2':
        sortText = '-price'
        break;
    case '3':
        sortText='price'
  }
  const cat =request.query.cat;
  const {text} = request.query;
  var startProId = ((Number(pid) -1) * Number(size))

  if(text != 'null' && text != 'undefined'){
    var query = new RegExp(text);
    //dueDate: { '$gte' : Date.now()}
    projectDb.find({dueDate: { '$lt' : Date.now()}}, async function (error, project) { // test때는 $lt 아닐때는 gte
      if(error)
      {
        console.log(error)
      }
      else{
        if(project)
        {
          Obj.flag="success"
          Obj.project = project
          const counts = await projectDb.find({dueDate: { '$lt' : Date.now()}}).where(cat).regex(query).countDocuments().exec()
          Obj.lastPage = Math.ceil(counts/ size)
          return response.send(Obj)
        }
        else
        {
          console.log('projects find error!')
          return response.send(Obj);
        }
      }
    })
    .sort(sortText).skip(startProId).limit(Number(size))
    .where(cat).regex(query)
  }
  else{
    projectDb.find({dueDate: { '$gte' : Date.now()}}, async function (error, project) { // test때는 $lt 아닐때는 gte
      if(error)
      {
        console.log(error)
      }
      else{
        if(project)
        {
          Obj.flag="success"
          Obj.project = project
          const counts = await projectDb.find({dueDate: { '$lt' : Date.now()}}).countDocuments().exec()
          Obj.lastPage = Math.ceil(counts/ size)
          return response.send(Obj)
        }
        else
        {
          console.log('projects find error!')
          return response.send(Obj);
        }
      }
    })
    .sort(sortText).skip(startProId).limit(Number(size))
  }
});



router.post('', function (request, response) {
  
  var Obj = new Object();
  Obj.flag = "fail"
  if (!auth.isOwner(request, response)) {
    return response.send(Obj)
  }
  var post = request.body
  // console.log("+++++++++++++++++");
  // console.log("저장될 데이터");
  // console.log(post);
  // console.log("+++++++++++++++++");
  
  var projectId = 0


  countDb.findById( {_id: "5db17c79d0ef0f8f884a5bd0"}, async function (error, data) {
    if (error) {
      console.log(error);
    } else {
      var project = new projectDb({
        id : request.user.id,
        projectId: data.count,
        userId: request.user.userId,
        nickname: request.user.nickname,
        //organization: post.organization,
        organization: request.user.organization,
        title: post.title,
        price: post.price,
        period: post.period,
        description: post.description,
        maxPeople: post.maxPeople,
        dueDate: post.dueDate,
        categoryList : post.categoryList
      })
    
      await project.save(function (error, data) {
        if (error) {
          console.log(error);
          console.log('unSaved!')
          return response.send(Obj)
        } else {
          console.log(project)
          console.log('Saved@!')
          
        }
      })
    
      projectDb.findOne({projectId : data.count},function(error,project)
      {
        console.log(project._id);
        userDb.findOne({userId: request.user.userId},function(err,user){
          if(err){
            console.log(err);
            return response.send(Obj)
          }
          else{
            user.proList.push(project._id);
            user.save();
          }
        })
        var timeline = new timelineDb({
          writer: request.user.nickname,
          projectOID : project._id,
          userOID : request.user._id,
          description: post.description
        })
        timeline.save(function (error, dat) {
          if (error) {
            console.log(error);
            return response.send(Obj)
          } else {
            console.log(dat)
          }
        })
      })

      data.count += 1 
      data.save({}, function(error, da){
      })

      Obj.flag="success"
      response.send(Obj)
    }
  });
});

router.get('/:projectOId', function (request, response) {
  console.log('project post');
  
  var Obj = new Object();
  Obj.flag = "fail"
  
  // if (!auth.isOwner(request, response)) {
  //   return response.send(Obj)
  // }

  //var post = request.body;
  var OId = request.params.projectOId;
  console.log(OId);
  
  projectDb.findOne({ _id: OId }, function (error, project) {

    if(error)
    {
      console.log(error)
      return response.send(Obj)
    }
    else{
      console.log(project);
      
      Obj.project = project
      Obj.flag="success"
      return response.send(Obj)
    }
  })

});
router.put('/:projectOId', function (request, response) {
  

  var Obj = new Object();
  Obj.flag = "fail"
  
  if (!auth.isOwner(request, response)) {
    return response.send(Obj)
  }

  var post = request.body.post;
  var OId = request.params.projectOId;

  projectDb.findOne({ _id: OId }, function (error, project) {
    if(error)
    {
      return response.send(Obj)
    }
    else{
      if(Number(request.query.flag) == 1) // 신청
      {
        userDb.findOne( { id: request.session.passport.user} , function(error, user)
        {
            console.log('enter')
            let chk = project.candiList.find(i =>{
              return user._id.equals(i)
            })
            let chk2 = project.freeList.find(i =>{
              return user._id.equals(i)
            })
            
            if(chk !==undefined || chk2 !=undefined){
              Obj.message='이미 신청한 프로젝트 입니다.'
            }
            else{
              Obj.message='신청되었습니다.'
              project.candiList.push(user._id)
              project.save()
            }
            Obj.flag="success"
            return response.send(Obj) 
        })
      }
      else if(request.query.flag == 2) //신청 받아주는것
      {
        if (project.userId !== request.user.userId) {
          return response.send(Obj)
        }
        userDb.findOne({ _id : request.query.userOId }, function(error, user)
        {
          console.log('here?');
          
            project.candiList.pop(user._id)
            project.freeList.push(user._id)
            project.save()
            user.proList.push(project._id)
            user.save()
            Obj.flag="success"
            return response.send(Obj) 
        })
      }
      else if(request.query.flag == 3) //신청 취소?
      {
        if (project.userId !== request.user.userId) {
          return response.send(Obj)
        }
        userDb.findOne({ _id : request.query.userOId}, function(error, user)
        {
          project.candiList.pop(user._id)
          project.freeList.pop(user._id)
          project.save()
          user.proList.pop(project._id)
          user.save()
          Obj.flag="success"
            return response.send(Obj) 
        })
      }
      else{
      
        if (project.userId !== request.user.userId) {
          
          return response.send(Obj)
        }
        
        if(post.projectId)
          project.projectId = post.projectId
        if(post.userId)
          project.userId= request.user.userId
        if(post.nickname)
          project.nickname= request.user.nickname
        if(post.organization)
          project.organization= post.organization
        if( post.title)
          project.title= post.title
        if(post.price)
          project.price= post.price
        if(post.period)
          project.period= post.period
        if(post.description)
          project.description= post.description
        if(post.maxPeople)
          project.maxPeople= post.maxPeople
      
        project.save(function (error, data) {
          if (error) {
            console.log(error);
            return response.send(Obj)
            console.log('unSaved!')
          } else {
            console.log('Saved!')
            Obj.flag="success"
            return response.send(Obj) 
          }
        })
      }
    }
  })
  
 /*  Obj.flag="success"
  return response.send(Obj)  */
});


router.delete('/:projectOId', function (request, response) {
  
  var Obj = new Object();
  Obj.flag = "fail"
  
  if (!auth.isOwner(request, response)) {
    return response.send(Obj)
  }
  
  var post = request.body;
  var OId = request.params.projectOId;
  projectDb.findOne({ _id: OId }, function (error, project) {
    userDb.find({}, function(err,user){
      if(err){
        console.log(err);
        return response.send(Obj)
      }
      else{
        for(let i  = 0 ; i < user.length; i ++){
          user[i].proList.pop(OId)
          user[i].save()
        }
        
      }

    }).where('proList').equals(mongoose.Types.ObjectId(OId))
    if(error)
    {
      console.log(error)
      return response.send(Obj)
    }
    else{
      if (project.userId !== request.user.userId) {
        return response.send(Obj)
      }
      
      projectDb.deleteOne({ _id : OId}, function(error, output){
        if(error){
            console.log(error);
        }
        else
        {
          Obj.flag="success"
          return response.send(Obj)
        }
    });
    }
  })
});

module.exports = router;