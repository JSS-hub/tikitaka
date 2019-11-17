var express = require('express');
var app = express();
var fs = require('fs');
var bodyParser = require('body-parser');
var compression = require('compression');
var helmet = require('helmet')
app.use(helmet());
var session = require('express-session')
var FileStore = require('session-file-store')(session)
var flash = require('connect-flash');
var projectDb = require('./lib/projectdb');
var userDb = require('./lib/userdb');
var timelineDb = require('./lib/timelinedb');
var multer = require('multer');
var path = require('path');


app.use(bodyParser.json());
app.use(express.static('public'));
app.use(bodyParser.urlencoded({
  extended: false
}));

app.use(compression());
app.use(session({
  secret: 'asadlfkj!@#!@#dfgasdg',
  resave: false,
  saveUninitialized: true,
  store: new FileStore()
}))
app.use(flash());

var passport = require('./lib/passport')(app);

app.get('/main', function (request, response) {
  var obj = new Object();
  obj.user = request.user;
  obj.logged =!!request.session.logged 
  if (request.user) {
    timelineDb.find({ userOID: request.user.followUserList }, function (error, timeline) {
      obj.timeline = timeline
      return response.send(obj);

    })
  }else{

    return response.send(obj);
  }

});


app.get('/test', function (req, res) {
  res.send(`<html>
  <head>
      <meta charset="UTF-8">
      <title>이미지 업로드</title>
  </head>
  <body>
      <img src="./public/images/2_multer21570637202542.png" width = "300"/>
      <form action="./images" method="POST" enctype="multipart/form-data">
          <input type="text" name="text"/>
          <input type="file" name="img" />
          <input type="submit" value="보내기"/>
      </form>
  </body>
</html>`);
})
app.get('/public/images/:filename', function (req, res) {

  // console.log(req.params.filename)

  fs.readFile('./public/images/' + req.params.filename, function (error, data) {
    if (error) {
      fs.readFile('./public/images/프로필.png', function (error, other) {
        res.writeHead(200, { 'Content-Type': 'text/html' });
        res.end(other)
        console.log(error)
      })
    }
    else {
      // console.log(data)
      res.writeHead(200, { 'Content-Type': 'text/html' });
      res.end(data);
    }
  })
})




const uploader = multer({

  storage: multer.diskStorage({

    destination(Req, file, cb) {
      cb(null, "public/images/");
    },
    filename(req, file, cb) {
      const ext = path.extname(file.originalname);
      req.user.userId
      console.log('테스트 +    ' + ext)
      //cb(null, path.basename(file.originalname, ext) + new Date().valueOf() + ext);
      cb(null, req.user.userId+ext);
    }
  })

  , limits: { filesize: 10 * 1024 * 1024 }
})

app.post('/images', uploader.single('img'), function (req, res, next) {
  console.log('test');
  console.log(req.file);
  res.json(req.body);
})

app.get('/fail', function (req, res) {
  let feedback = req.flash()
  res.json({
    message:feedback.error
  })
})


var projectRouter = require('./routes/project');
var userRouter = require('./routes/user');
var authRouter = require('./routes/auth')(passport);
var timeRouter = require('./routes/timeline');
app.use('/project', projectRouter);
app.use('/auth', authRouter);
app.use('/user', userRouter);
app.use('/timeline', timeRouter);

app.use(function (err, req, res, next) {
  console.log(err)
  res.status(404).send('Sorry cant find that!');
});


app.use(function (err, req, res, next) {
  console.error(err.stack)
  res.status(500).send('Something broke!')
});


app.listen(4000, function () {
  console.log('Example app listening on port 4000!')
});