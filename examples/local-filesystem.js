// This is just a trivial example as to how you set guerrero up in general. Since the source directory doesn't contain
// any media files, this will not actually output (or do) anything useful.
var path = require('path');

var ConsoleWriter = require('../src/writer/ConsoleWriter'),
    FileSystemCollector = require('../src/collector/FileSystemCollector');

var collector = new FileSystemCollector({}),
    writer = new ConsoleWriter({
        collector: collector
    });

var dir = path.join(__dirname, '..', 'src');

collector.execute(dir, function () {
    console.log('done!');
});
