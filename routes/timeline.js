var express = require('express');
var router = express.Router();
var fs = require('fs');
var timelineDb = require('../lib/timelinedb');


router.get('', function(request,response){

    var obj = new Object();
    obj.flag = "fail";

    if(!request.user)
        return response.send(obj);
    
    
    var pid;
    if(request.query.pageId)
        pid = request.query.pageId;
    else
        pid = 1;
    var size;
    if(request.query.size)
      size = request.query.size;
    else
      size = 10; 
    
    var startProId = ((Number(pid) -1) * Number(size))

    // console.log(request.user.followUserList)

      timelineDb.find({ $or : [{userOID : request.user.followUserList},{projectOID : request.user.followProList}]},function(error,timeline){
        obj.timeline = timeline
        obj.flag="success"
        return response.send(obj);
      }).sort().skip(startProId).limit(Number(size))
    

})
module.exports = router;