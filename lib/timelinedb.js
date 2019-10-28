
var mongoose = require('mongoose');
var timeline = mongoose.Schema({
    writeDate: {
        type:Date,
        default: Date.now
    },
    writer: 'string',
    userOID : 'ObjectId',
    projectOID : 'ObjectId',
    thumbnail: 'string'
});
module.exports = mongoose.model('timeline', timeline);

