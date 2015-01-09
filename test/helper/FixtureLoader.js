var fs = require('fs');

var FixtureLoader = {
    load: function (name) {
        return fs.readFileSync(__dirname + '/../fixtures/' + name).toString();
    }
};

module.exports = FixtureLoader;
