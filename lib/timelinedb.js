
var mongoose = require('mongoose');
var timeline = mongoose.Schema({
    writeDate: {
        type:Date,
        default: Date.now
    },
    userId:'string',
    writer: 'string',
    userOID : 'ObjectId',
    projectOID : 'ObjectId',
    thumbnail: 'string'
});
module.exports = mongoose.model('timeline', timeline);

