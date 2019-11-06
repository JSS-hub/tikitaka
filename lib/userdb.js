
var mongoose = require('mongoose');
var user = mongoose.Schema({
    id : 'string',
    userId : 'string',
    password : 'string',
    name : 'string',
    nickname : 'string',
    location : 'string',
    organization : 'string',
    freeflag : 'Number',
    proList : ['Objectid'],
    chatList : ['Objectid'],
    followUserList : ['Objectid'],
    followProList : ['Objectid'],
    followerList : ['Objectid'],
    intro : 'string',
    grade : 'Number',
    categoryList : ['string'],
    lisenceList : ['string'],
    careerList : ['string'],
    educationList : ['string']
});

module.exports = mongoose.model('user', user);

