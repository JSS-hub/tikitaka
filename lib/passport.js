var userDb = require('../lib/userdb');
var bcrypt = require('bcrypt');

var shortid = require('shortid');
var mongoose = require('mongoose');

var key = require('./.my_key')

mongoose.connect('mongodb://localhost:27017/testDB', { useNewUrlParser: true });
var db = mongoose.connection;


db.on('error', function () {
    console.log('Connection Failed!');
});
db.once('open', function () {
    console.log('Connected!');
});

module.exports = function (app) {
    console.log('호출확인')

    var passport = require('passport'),
        LocalStrategy = require('passport-local').Strategy,
        NaverStrategy = require('passport-naver').Strategy,
        KakaoStrategy = require('passport-kakao').Strategy;

    var client_id = key.client_id;
    var client_secret = key.client_secret;
    var callback_url = 'http://119.18.120.225:4000/auth/naver/callback';

    app.use(passport.initialize());
    app.use(passport.session());

    passport.serializeUser(function (user, done) {
        console.log('serializeUser', user);
        done(null, user.id);
    });

    passport.deserializeUser(function (id, done) {
        userDb.findOne({ id: id }, function (error, user) {
            if (error) {
                console.log(error);
            } else {
                console.log('deserializeUser', id, user);
                done(null, user);
            }
        });

    });

    passport.use(new LocalStrategy({
        usernameField: 'userId',
        passwordField: 'password'
    },
    function (userId, password, done) {
        console.log('LocalStrategy', userId, password);
        userDb.findOne({userId: userId},function(error,user){
            if(error){
                console.log(error);
            }else{
                if (user) {
                    console.log(user.verification);
                    
                    if(!user.verification)
                    {
                        console.log('why?');
                        
                        return done(null, false, {
                            message: '메일 본인 인증을 받으세요.'
                        });
                    } 
                    bcrypt.compare(password, user.password, function(err,result){
    
                        if(result){
                            console.log("Login succ")
                            return done(null, user, {
                                message: 'Welcome.'                 
                            });
                        } else {
                            console.log("Login False")
                            return done(null, false, {
                                message: '비밀번호가 일치하지 않습니다.'
                            });
                        }
                    });
                } else {
                    return done(null, false, {
                        message: '존재하지않는 이메일 입니다.'
                    });
                }
            }
        })
    }
));

    passport.use(new NaverStrategy({
        clientID: client_id,
        clientSecret: client_secret,
        callbackURL: callback_url,
        svcType: 0  // optional. see http://gamedev.naver.com/index.php/%EC%98%A8%EB%9D%BC%EC%9D%B8%EA%B2%8C%EC%9E%84:OAuth_2.0_API
    }, function (accessToken, refreshToken, profile, done) {
        process.nextTick(function () {
            //console.log("profile=");
            //console.log(profile);
            // data to be saved in DB

            userDb.findOne({ userId: profile.emails[0].value }, function (error, users) {
                if (users) {
                    userDb.findOne({ userId: profile.emails[0].value }, function (error, users) {
                        var retuser = users
                        console.log('api 로그인 return 전1')
                        return done(null, users);
                    })
                }
                else {
                    var user = new userDb({ id: shortid.generate(), userId: profile.emails[0].value, displayName: profile.displayName, provider: 'naver', naver: profile._json })

                    user.save(function (error, data) {
                        if (error) {
                            console.log(error);
                            console.log('unSaved!')
                        } else {
                            console.log('Saved!')
                        }

                        userDb.findOne({ userId: profile.emails[0].value }, function (error, users) {
                            var retuser = users
                            console.log('api 로그인 return 전2')
                            return done(null, users);
                        })
                    });
                }
            })
        });
    }));


    passport.use(new KakaoStrategy({
        clientID: key.clientID,
        callbackURL: 'http://119.18.120.225:3000/auth/kakao/callback'
    },
        function (accessToken, refreshToken, profile, done) {
            // 사용자의 정보는 profile에 들어있다.
            var _profile = profile._json

            userDb.findOne({ userId: _profile.kaccount_email }, function (error, users) {
                if (users) {
                    userDb.findOne({ userId: _profile.kaccount_email }, function (error, users) {
                        var retuser = users
                        console.log('kakao api 로그인 return 전1')
                        return done(null, users);
                    })
                }
                else {
                    var user = new userDb({ id: _profile.id, userId: _profile.kaccount_email, displayName: _profile.properties.nickname, provider: profile.provider })

                    user.save(function (error, data) {
                        if (error) {
                            console.log(error);
                            console.log('kakao unSaved!')
                        } else {
                            console.log('kakao Saved!')
                        }

                        userDb.findOne({ userId: _profile.kaccount_email }, function (error, users) {
                            var retuser = users
                            console.log('kakao api 로그인 return 전2')
                            return done(null, users);
                        })
                    });
                }
            }
            )



        }));

    app.get('/auth/kakao', passport.authenticate('kakao', {
        failureRedirect: '/auth/login'
    }));
    // , users.signin

    app.get('/auth/kakao/callback', passport.authenticate('kakao', {
        failureRedirect: '/auth/login',
        successRedirect: 'http://119.18.120.225:3000'
    }))


    // , users.createAccount, users.authCallback   

    app.get('/auth/naver', passport.authenticate('naver', {
        failureRedirect: '/auth/login'
    }));
    // , users.signin

    app.get('/auth/naver/callback', passport.authenticate('naver', {
        failureRedirect: '/auth/login'
    }), function (req, res) {
        res.redirect('http://119.18.120.225:3000');
    });

    // , users.createAccount, users.authCallback    
    return passport;
}