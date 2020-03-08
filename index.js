const { createServer } = require('http');

const server = createServer((req, res) => {
	res.write('foobar');
	res.end();
});

server.listen(3000);