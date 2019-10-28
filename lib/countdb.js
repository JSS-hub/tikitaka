
var mongoose = require('mongoose');
var count = mongoose.Schema({
    count : 'Number'
});
module.exports = mongoose.model('count', count);

