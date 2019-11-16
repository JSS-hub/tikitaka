
var mongoose = require('mongoose');
var user = mongoose.Schema({
    id : 'string',
    userId : 'string',
    password : 'string',
    name : 'string',
    nickname : 'string',
    location : 'string',
    verification : 'Number',
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
    careerList : [{
        getDate :{type:Date},
        things : {type:String}
    }],
    lisenceList : ["string"],
    educationList : [{
        getDate :{type:Date},
        things : {type:String}
    }]
});

module.exports = mongoose.model('user', user);

// careerList : [{
//     date :'date',
//     career : "string"
// }],
// lisenceList : [{
//     date :'date',
//     lisence : "string"
// }],