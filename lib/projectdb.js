
var mongoose = require('mongoose');
var project = mongoose.Schema({
    projectId: 'Number',
    userId: 'string',
    nickname: 'string',
    organization: 'string',
    writeDate: {
        type:Date,
        default: Date.now
    },
    title: 'string',
    price: 'Number',
    period: 'Number',
    dueDate: {
        type:Date,
        default: Date.now
    },
    description: 'string',
    maxPeople: 'Number',
    categoryList: ['String'],
    freeList: ['ObjectId'],
    candiList: ['ObjectId'],
    followerList : ['Objectid']
});
module.exports = mongoose.model('project', project);

